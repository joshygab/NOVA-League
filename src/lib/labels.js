export const goalTypes = [
  { id: 'open_play', name: 'Jugada' },
  { id: 'penalty', name: 'Penal' },
  { id: 'free_kick', name: 'Tiro libre' },
  { id: 'header', name: 'Cabeza' },
  { id: 'own_goal', name: 'Autogol' },
]

export function goalTypeLabel(type) {
  return goalTypes.find((item) => item.id === type)?.name || type
}

export function playoffStageLabel(stage) {
  return {
    semifinal: 'Semifinal',
    final: 'Final',
    third_place: 'Tercer lugar',
  }[stage] || stage
}
