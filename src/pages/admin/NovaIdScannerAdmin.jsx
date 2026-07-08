import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { Camera, CheckCircle, Search, ShieldAlert, XCircle } from 'lucide-react'
import PlayerAvatar from '../../components/PlayerAvatar'
import { confirmNovaIdAttendance } from '../../lib/adminApi'
import { parseNovaId, playerNovaId, playerStatus } from '../../lib/novaId'

export default function NovaIdScannerAdmin({ league, run, busy }) {
  const [matchId, setMatchId] = useState('')
  const [manualCode, setManualCode] = useState('')
  const [scanResult, setScanResult] = useState(null)
  const [cameraOn, setCameraOn] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [cameraMode, setCameraMode] = useState('environment')
  const [cameraId, setCameraId] = useState('')
  const [cameras, setCameras] = useState([])
  const [verified, setVerified] = useState(false)
  const [scannerEngine, setScannerEngine] = useState('')
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const qrRef = useRef(null)
  const scannerId = 'nova-id-html5-reader'
  const match = league.matches.find((item) => item.id === matchId)

  useEffect(() => {
    if (!cameraOn) return undefined
    let cancelled = false
    let frameId = 0

    async function stopNativeCamera() {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    async function stopHtmlScanner() {
      if (!qrRef.current) return
      try {
        await qrRef.current.stop()
      } catch {
        // El lector puede estar detenido ya.
      }
      try {
        await qrRef.current.clear()
      } catch {
        // Limpieza defensiva del contenedor.
      }
      qrRef.current = null
    }

    function onDetected(raw) {
      if (cancelled) return
      setVerified(true)
      navigator.vibrate?.(200)
      handleLookup(raw)
      setTimeout(() => {
        if (!cancelled) setCameraOn(false)
      }, 450)
    }

    async function startHtmlScanner(reason = '') {
      await stopNativeCamera()
      if (cancelled) return
      setScannerEngine('html5')
      if (reason) setCameraError(reason)
      const devices = await Html5Qrcode.getCameras()
      setCameras(devices)
      if (!devices.length) {
        setCameraError('No se encontró una cámara disponible.')
        setCameraOn(false)
        return
      }
      const selectedCamera = cameraId || devices.find((device) => /back|rear|environment|trasera/i.test(device.label))?.id || devices[0].id
      setCameraId(selectedCamera)
      const scanner = new Html5Qrcode(scannerId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      })
      qrRef.current = scanner
      await scanner.start(
        selectedCamera,
        { fps: 10, qrbox: (viewfinderWidth, viewfinderHeight) => {
          const size = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.72)
          return { width: size, height: size }
        } },
        onDetected,
        () => {}
      )
    }

    async function start() {
      setCameraError('')
      setVerified(false)
      setScannerEngine('')
      try {
        if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
          setCameraError('La cámara necesita HTTPS. En Vercel funciona con https://; en local usa localhost.')
          setCameraOn(false)
          return
        }
        if (!navigator.mediaDevices?.getUserMedia) {
          setCameraError('Este navegador no permite usar la cámara. Usa Chrome/Safari actualizado o captura manual.')
          setCameraOn(false)
          return
        }
        if (!window.BarcodeDetector) {
          await startHtmlScanner('')
          return
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: cameraId ? { deviceId: { exact: cameraId } } : { facingMode: { ideal: cameraMode }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        streamRef.current = stream
        setScannerEngine('native')
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
        async function tick() {
          if (cancelled || !videoRef.current) return
          try {
            const codes = await detector.detect(videoRef.current)
            if (codes[0]?.rawValue) {
              onDetected(codes[0].rawValue)
              return
            }
          } catch {
            await startHtmlScanner('')
            return
          }
          frameId = requestAnimationFrame(tick)
        }
        tick()
      } catch (error) {
        if (error?.name === 'NotAllowedError') {
          setCameraError('No tenemos permiso para usar la cámara. Actívala en ajustes.')
          setCameraOn(false)
          return
        }
        if (error?.name === 'NotFoundError' || error?.name === 'OverconstrainedError') {
          setCameraError('No se encontró una cámara disponible.')
          setCameraOn(false)
          return
        }
        try {
          await startHtmlScanner('')
        } catch {
          setCameraError('No se pudo iniciar la cámara. Revisa permisos o usa captura manual.')
          setCameraOn(false)
        }
      }
    }
    start()
    return () => {
      cancelled = true
      if (frameId) cancelAnimationFrame(frameId)
      stopNativeCamera()
      stopHtmlScanner()
    }
  }, [cameraOn, cameraId, cameraMode])

  function switchCamera() {
    if (cameras.length > 1) {
      const currentIndex = cameras.findIndex((camera) => camera.id === cameraId)
      const next = cameras[(currentIndex + 1 + cameras.length) % cameras.length]
      setCameraId(next.id)
    } else {
      setCameraMode((mode) => mode === 'environment' ? 'user' : 'environment')
      setCameraId('')
    }
    if (cameraOn) {
      setCameraOn(false)
      setTimeout(() => setCameraOn(true), 120)
    }
  }

  function handleLookup(raw) {
    const novaId = parseNovaId(raw)
    const player = league.players.find((item, index) => playerNovaId(item, index) === novaId)
    if (!player) {
      setScanResult({ status: 'missing', message: 'Jugador no encontrado.' })
      return
    }
    const team = league.teamsById.get(player.team_id)
    const stats = league.playerStatsById.get(player.id)
    if (!match) {
      setScanResult({ status: 'missing', message: 'Selecciona un partido antes de validar.' })
      return
    }
    if (![match.home_team_id, match.away_team_id].includes(player.team_id)) {
      setScanResult({ status: 'wrong_team', message: 'Jugador registrado en otro equipo.', player, team, stats })
      return
    }
    if (stats?.activeSanctions?.length) {
      setScanResult({ status: 'blocked', message: 'NO AUTORIZADO', reason: stats.activeSanctions[0].reason, remaining: stats.activeSanctions[0].suspended_matches, player, team, stats })
      return
    }
    setScanResult({ status: 'approved', message: 'APROBADO', player, team, stats })
  }

  async function confirmAttendance() {
    if (!scanResult?.player || !match) return
    await run(() => confirmNovaIdAttendance({ match, player: scanResult.player }), 'Asistencia confirmada en acta digital')
  }

  return (
    <section className="space-y-5">
      <div className="panel p-5">
        <h2 className="text-2xl font-black">Escáner NOVA ID</h2>
        <p className="mt-1 text-sm text-slate-400">Valida jugadores antes del partido y agrégalos al acta digital.</p>
        <select className="input mt-4" value={matchId} onChange={(event) => { setMatchId(event.target.value); setScanResult(null) }}>
          <option value="">Seleccionar partido</option>
          {league.matches.map((item) => <option key={item.id} value={item.id}>J{item.round} {league.teamsById.get(item.home_team_id)?.name} vs {league.teamsById.get(item.away_team_id)?.name}</option>)}
        </select>
      </div>

      <div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
        <div className="panel space-y-4 p-5">
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <button className="button min-h-16 w-full text-base" onClick={() => setCameraOn(!cameraOn)}><Camera size={20} />{cameraOn ? 'Detener cámara' : 'Escanear jugador'}</button>
            <button className="button-secondary min-h-16" onClick={switchCamera}>Cambiar cámara</button>
          </div>
          {cameraOn && (
            <div className="relative overflow-hidden rounded-lg border border-gold/30 bg-black">
              <video ref={videoRef} autoPlay muted playsInline className={scannerEngine === 'native' ? 'aspect-video w-full object-cover' : 'hidden'} />
              <div id={scannerId} className={scannerEngine === 'html5' ? 'min-h-[260px] [&_video]:rounded-lg [&_video]:object-cover' : 'hidden'} />
              <div className="pointer-events-none absolute inset-0 grid place-items-center">
                <div className="h-44 w-44 rounded-2xl border-2 border-gold shadow-gold" />
              </div>
              <p className="absolute bottom-3 left-3 right-3 rounded-lg bg-black/70 px-3 py-2 text-center text-sm font-bold text-gold">Coloca el QR dentro del cuadro</p>
              {verified && <div className="absolute inset-0 grid place-items-center bg-emerald-500/20 backdrop-blur-sm"><p className="rounded-lg bg-black px-4 py-3 text-xl font-black text-emerald-200">NOVA ID VERIFIED ✅</p></div>}
            </div>
          )}
          {cameraError && <p className="rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 text-sm text-gold">{cameraError}</p>}
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <p className="text-sm font-bold">Respaldo manual</p>
            <div className="mt-2 flex gap-2">
              <input className="input" placeholder="NVL-000001" value={manualCode} onChange={(event) => setManualCode(event.target.value)} />
              <button className="button-secondary px-3" onClick={() => handleLookup(manualCode)}><Search size={18} /></button>
            </div>
          </div>
        </div>

        <ValidationCard result={scanResult} onConfirm={confirmAttendance} busy={busy} />
      </div>
    </section>
  )
}

function ValidationCard({ result, onConfirm, busy }) {
  if (!result) return <div className="panel grid min-h-80 place-items-center p-5 text-center text-slate-400">Escanea un NOVA ID para validar al jugador.</div>
  if (!result.player) return <div className="panel grid min-h-80 place-items-center p-5 text-center"><XCircle className="text-red-300" size={54} /><p className="mt-3 text-xl font-black text-red-200">{result.message}</p></div>

  const status = playerStatus(result.player, result.stats)
  const approved = result.status === 'approved'
  return (
    <div className={`panel p-5 ${approved ? 'border-emerald-400/40 bg-emerald-500/10' : 'border-red-400/40 bg-red-500/10'}`}>
      <div className="flex items-center gap-4">
        <PlayerAvatar src={result.player.photo_url} name={result.player.name} size="lg" />
        <div>
          <p className="text-2xl font-black uppercase">{result.player.name}</p>
          <p className="text-gold">#{result.player.number || '--'} · {result.team?.name}</p>
          <p className="text-sm text-slate-300">{status.icon} {status.label}</p>
        </div>
      </div>
      <div className="mt-5 rounded-lg border border-white/10 bg-black/25 p-4">
        {approved ? <CheckCircle className="text-emerald-300" /> : <ShieldAlert className="text-red-300" />}
        <p className={`mt-2 text-2xl font-black ${approved ? 'text-emerald-200' : 'text-red-200'}`}>{approved ? 'AUTORIZADO PARA JUGAR' : result.message}</p>
        {result.reason && <p className="mt-2 text-sm text-red-100">Motivo: {result.reason}</p>}
        {result.remaining != null && <p className="text-sm text-red-100">Partidos restantes: {result.remaining}</p>}
      </div>
      {approved && <button className="button mt-5 w-full" disabled={busy} onClick={onConfirm}>CONFIRMAR ASISTENCIA</button>}
    </div>
  )
}
