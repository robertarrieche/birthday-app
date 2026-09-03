export function roastFor(index, totalGuests, allZero) {
  if (allZero) {
    const lines = [
      '¿Seguro que conocen a Robert? 💀',
      'Esto fue un examen… y todos reprobaron',
      'Ni con pista y rezar se salvaban',
    ]
    return lines[index % lines.length]
  }

  if (index === 0) {
    return 'Stalker oficial del cumpleañero 👑'
  }
  if (index === 1) {
    return 'Tan cerca… y tan lejos 🥈'
  }
  if (index === 2) {
    return 'Bronce: el podio de “casi” 🥉'
  }
  if (index === totalGuests - 1 && totalGuests > 1) {
    return 'Premio a la lealtad incondicional 😂'
  }

  const mid = [
    'Aprobaste… de milagro',
    'Conoces a Robert… a medias',
    '¿Estabas prestando atención?',
    'Puntos de participación, nada más',
  ]
  return mid[index % mid.length]
}
