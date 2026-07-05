import { useEffect, useState } from 'react'
import { formatCommentSnapshot, formatRelativeTime } from '../utils/relativeTime'

interface CommentTimestampProps {
  createdAt: string
}

export default function CommentTimestamp({ createdAt }: CommentTimestampProps) {
  const [, setTick] = useState(0)

  useEffect(() => {
    const intervalId = window.setInterval(() => setTick((value) => value + 1), 60_000)
    return () => window.clearInterval(intervalId)
  }, [])

  const relative = formatRelativeTime(createdAt)
  const snapshot = formatCommentSnapshot(createdAt)

  return (
    <time
      dateTime={createdAt}
      title={snapshot}
      className="shrink-0 cursor-default whitespace-nowrap text-[10px] text-[#A0A0AC] underline-offset-2 hover:underline"
    >
      {relative}
    </time>
  )
}
