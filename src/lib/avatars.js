export const AVATARS = [
  { id: 'wizard',    emoji: '🧙', label: 'Mago'        },
  { id: 'ninja',     emoji: '🥷', label: 'Ninja'       },
  { id: 'astronaut', emoji: '👨‍🚀', label: 'Astronauta'  },
  { id: 'pirate',    emoji: '🏴‍☠️', label: 'Pirata'      },
  { id: 'robot',     emoji: '🤖', label: 'Robot'       },
  { id: 'alien',     emoji: '👾', label: 'Alienígena'  },
  { id: 'vampire',   emoji: '🧛', label: 'Vampiro'     },
  { id: 'zombie',    emoji: '🧟', label: 'Zombie'      },
  { id: 'superhero', emoji: '🦸', label: 'Superhéroe'  },
  { id: 'detective', emoji: '🕵️', label: 'Detective'   },
  { id: 'chef',      emoji: '👨‍🍳', label: 'Chef'        },
  { id: 'rockstar',  emoji: '🎸', label: 'Rockstar'    },
]

export const REACTION_EMOJIS = ['🎉', '😂', '🤔', '❤️', '🔥', '😱', '👏', '🤯']

export function isPhotoAvatar(avatar) {
  return typeof avatar === 'string' && (avatar.startsWith('data:image') || avatar.startsWith('http'))
}

export function avatarEmoji(avatar) {
  return AVATARS.find(a => a.id === avatar)?.emoji || '👤'
}

export function compressSelfie(file, size = 192, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      const min = Math.min(img.width, img.height)
      const sx = (img.width - min) / 2
      const sy = (img.height - min) / 2
      ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('No se pudo leer la foto'))
    }
    img.src = url
  })
}
