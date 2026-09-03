import { avatarEmoji, isPhotoAvatar } from '../lib/avatars'

const SIZES = {
  xs: 'w-6 h-6 text-base',
  sm: 'w-8 h-8 text-xl',
  md: 'w-10 h-10 text-2xl',
  lg: 'w-16 h-16 md:w-20 md:h-20 text-4xl',
  xl: 'w-24 h-24 text-6xl',
}

export default function AvatarFace({ avatar, size = 'md', className = '' }) {
  const box = `${SIZES[size] || SIZES.md} ${className}`

  if (isPhotoAvatar(avatar)) {
    return (
      <img
        src={avatar}
        alt=""
        className={`rounded-full object-cover border-2 border-blue-400 bg-slate-800 ${box}`}
      />
    )
  }

  return (
    <span className={`inline-flex items-center justify-center rounded-full bg-blue-900/60 border-2 border-blue-500 ${box}`}>
      {avatarEmoji(avatar)}
    </span>
  )
}
