const MINUTE_MS = 60000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS

type DateTimeParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
}

function parseLocalDateTime(time: string): DateTimeParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(time)

  if (!match) {
    return null
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
  }
}

function getLocalDateTimeParts(date: Date): DateTimeParts {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    hour: date.getHours(),
    minute: date.getMinutes(),
  }
}

function getZonedDateTimeParts(date: Date, timezone: string): DateTimeParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
  const values: Record<string, number> = {}

  for (const part of formatter.formatToParts(date)) {
    if (part.type !== 'literal') {
      values[part.type] = Number(part.value)
    }
  }

  if (
    !values.year ||
    !values.month ||
    !values.day ||
    values.hour === undefined ||
    values.minute === undefined
  ) {
    throw new Error('Unable to format zoned date parts.')
  }

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
  }
}

function dateTimePartsToTimestamp(parts: DateTimeParts) {
  return Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
  )
}

function padDatePart(value: number) {
  return String(value).padStart(2, '0')
}

function formatDateTimeParts(parts: DateTimeParts) {
  return `${padDatePart(parts.day)}.${padDatePart(parts.month)}.${parts.year}, ${padDatePart(parts.hour)}:${padDatePart(parts.minute)}`
}

export function formatLastUpdated(
  time: string,
  timezone: string,
  now = new Date(),
) {
  const updatedParts = parseLocalDateTime(time)

  if (!updatedParts) {
    return `${time.replace('T', ' ')} (${timezone})`
  }

  let nowParts: DateTimeParts

  try {
    nowParts = getZonedDateTimeParts(now, timezone)
  } catch {
    nowParts = getLocalDateTimeParts(now)
  }

  const diffMs = Math.max(
    0,
    dateTimePartsToTimestamp(nowParts) -
      dateTimePartsToTimestamp(updatedParts),
  )

  if (diffMs > DAY_MS) {
    return formatDateTimeParts(updatedParts)
  }

  if (diffMs < MINUTE_MS) {
    return 'just now'
  }

  if (diffMs < HOUR_MS) {
    const minutes = Math.floor(diffMs / MINUTE_MS)
    return `${minutes} min ago`
  }

  const hours = Math.floor(diffMs / HOUR_MS)
  return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`
}
