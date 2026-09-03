function unwrap(value) {
  let current = value
  for (let i = 0; i < 4; i++) {
    if (typeof current !== 'string') break
    const trimmed = current.trim()
    if (!(trimmed.startsWith('[') || trimmed.startsWith('{') || trimmed.startsWith('"'))) break
    try {
      current = JSON.parse(trimmed)
    } catch {
      break
    }
  }
  return current
}

function asList(value) {
  const parsed = unwrap(value)
  if (parsed == null || parsed === '') return []
  return Array.isArray(parsed) ? parsed : [parsed]
}

function norm(value) {
  return String(value ?? '').trim()
}

export function isBombQuestion(question) {
  const flag = question?.is_bomb
  return flag === true || flag === 'true' || flag === 1 || flag === '1' || flag === 't'
}

export function parsePowerups(raw) {
  const data = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
  return {
    luckyQid: data.luckyQid || null,
    discardQid: data.discardQid || null,
    discardOption: data.discardOption || null,
    hintQid: data.hintQid || null,
  }
}

export function extrasFor(participant, questionId) {
  const powerups = parsePowerups(participant?.powerups)
  return {
    lucky: powerups.luckyQid && String(powerups.luckyQid) === String(questionId),
    hint: powerups.hintQid && String(powerups.hintQid) === String(questionId),
    discard: powerups.discardQid && String(powerups.discardQid) === String(questionId),
  }
}

export function questionOptions(question) {
  return asList(question?.options).map(norm)
}

export function questionCorrectList(question) {
  return asList(question?.correct_answer).map(norm)
}

export function pickDiscardOption(question) {
  const options = questionOptions(question)
  const correct = questionCorrectList(question)
  const wrong = options.filter(opt => !correct.includes(opt))
  if (wrong.length === 0) return null
  return wrong[Math.floor(Math.random() * wrong.length)]
}

export function scoreAnswer(question, rawAnswer, extras = {}, hasAnswer = true) {
  if (!question) return 0

  const givenList = asList(unwrap(rawAnswer)).map(norm)
  const correctList = questionCorrectList(question)

  let base = 0
  if (hasAnswer) {
    if (question.type === 'single') {
      if (givenList[0] && givenList[0] === correctList[0]) base = 1
    } else if (question.type === 'multiple') {
      if (correctList.length > 0) {
        const hits = givenList.filter(item => correctList.includes(item)).length
        base = hits / correctList.length
      }
    } else if (question.type === 'order') {
      if (correctList.length > 0) {
        const hits = correctList.filter((item, idx) => givenList[idx] === item).length
        base = hits / correctList.length
      }
    }
  }

  const fullyCorrect = hasAnswer && base === 1
  let points = base * (isBombQuestion(question) ? 2 : 1)

  if (extras.lucky) {
    if (fullyCorrect) points *= 2
    else points -= 1
  }
  if (extras.hint) points -= 0.5

  return points
}

export function totalScores(participants, questions, answers) {
  const scores = {}
  const sortedQuestions = [...questions].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))

  participants
    .filter(p => !p.is_admin)
    .forEach(p => {
      const pid = String(p.id)
      scores[pid] = 0
      sortedQuestions.forEach(question => {
        const answer = answers.find(item =>
          String(item.participant_id) === pid &&
          String(item.question_id) === String(question.id)
        )
        const extras = extrasFor(p, question.id)
        if (!answer && !extras.lucky && !extras.hint) return
        scores[pid] += scoreAnswer(question, answer?.answer, extras, !!answer)
      })
    })

  Object.keys(scores).forEach(id => {
    scores[id] = Math.round(scores[id] * 100) / 100
  })

  return scores
}

export function questionMaxPoints(question, extras = {}) {
  let max = isBombQuestion(question) ? 2 : 1
  if (extras.lucky) max *= 2
  if (extras.hint) max -= 0.5
  return max
}

export function buildScoreBreakdown(participants, questions, answers) {
  const sortedQuestions = [...questions].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
  const guests = participants.filter(p => !p.is_admin)

  return guests.map(participant => {
    const perQuestion = sortedQuestions.map(question => {
      const answer = answers.find(item =>
        String(item.participant_id) === String(participant.id) &&
        String(item.question_id) === String(question.id)
      )
      const extras = extrasFor(participant, question.id)
      const usedPowerup = extras.lucky || extras.hint || extras.discard
      if (!answer && !extras.lucky && !extras.hint) {
        return {
          questionId: question.id,
          points: null,
          max: questionMaxPoints(question, extras),
          answered: false,
          extras,
        }
      }
      return {
        questionId: question.id,
        points: Math.round(scoreAnswer(question, answer?.answer, extras, !!answer) * 100) / 100,
        max: questionMaxPoints(question, extras),
        answered: !!answer,
        extras,
        usedPowerup,
      }
    })
    const total = Math.round(
      perQuestion.reduce((sum, cell) => sum + (cell.points || 0), 0) * 100
    ) / 100
    return { participant, perQuestion, total }
  })
}
