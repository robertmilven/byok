// Curated option lists for all prompt builder dropdowns

export const SHOT_TYPES = [
    { value: 'close-up', label: 'Close-Up' },
    { value: 'extreme-close-up', label: 'Extreme Close-Up' },
    { value: 'medium', label: 'Medium Shot' },
    { value: 'medium-wide', label: 'Medium Wide' },
    { value: 'wide', label: 'Wide Shot' },
    { value: 'full-body', label: 'Full Body' },
    { value: 'aerial', label: 'Aerial / Bird\'s Eye' },
    { value: 'drone', label: 'Drone Shot' },
    { value: 'worm-eye', label: 'Worm\'s Eye View' },
    { value: 'over-shoulder', label: 'Over the Shoulder' },
    { value: 'pov', label: 'POV' },
    { value: 'macro', label: 'Macro' },
    { value: 'portrait', label: 'Portrait' },
    { value: 'headshot', label: 'Headshot' },
    { value: 'establishing', label: 'Establishing Shot' },
    { value: 'tracking', label: 'Tracking Shot' },
    { value: 'dutch-angle', label: 'Dutch Angle' },
] as const

export const LIGHTING_OPTIONS = [
    { value: 'golden-hour', label: 'Golden Hour' },
    { value: 'blue-hour', label: 'Blue Hour' },
    { value: 'studio', label: 'Studio Lighting' },
    { value: 'softbox', label: 'Softbox / Diffused' },
    { value: 'rembrandt', label: 'Rembrandt Lighting' },
    { value: 'rim', label: 'Rim / Backlight' },
    { value: 'neon', label: 'Neon Lights' },
    { value: 'dramatic', label: 'Dramatic / Chiaroscuro' },
    { value: 'flat', label: 'Flat / Even' },
    { value: 'natural', label: 'Natural Daylight' },
    { value: 'overcast', label: 'Overcast / Cloudy' },
    { value: 'candlelight', label: 'Candlelight' },
    { value: 'sunrise', label: 'Sunrise' },
    { value: 'sunset', label: 'Sunset' },
    { value: 'night', label: 'Night / Low Light' },
    { value: 'underwater', label: 'Underwater' },
    { value: 'fluorescent', label: 'Fluorescent' },
    { value: 'fire', label: 'Firelight' },
    { value: 'moonlight', label: 'Moonlight' },
    { value: 'harsh-sun', label: 'Harsh Midday Sun' },
] as const

export const MOOD_OPTIONS = [
    { value: 'cinematic', label: 'Cinematic' },
    { value: 'dreamy', label: 'Dreamy / Ethereal' },
    { value: 'gritty', label: 'Gritty / Raw' },
    { value: 'melancholic', label: 'Melancholic' },
    { value: 'romantic', label: 'Romantic' },
    { value: 'mysterious', label: 'Mysterious / Dark' },
    { value: 'energetic', label: 'Energetic / Dynamic' },
    { value: 'serene', label: 'Serene / Peaceful' },
    { value: 'tense', label: 'Tense / Thriller' },
    { value: 'joyful', label: 'Joyful / Uplifting' },
    { value: 'nostalgic', label: 'Nostalgic / Retro' },
    { value: 'surreal', label: 'Surreal / Fantastical' },
    { value: 'minimalist', label: 'Minimalist / Clean' },
    { value: 'epic', label: 'Epic / Grand' },
    { value: 'intimate', label: 'Intimate / Tender' },
    { value: 'horror', label: 'Horror / Eerie' },
    { value: 'editorial', label: 'Editorial / Fashion' },
    { value: 'documentary', label: 'Documentary / Real' },
    { value: 'futuristic', label: 'Futuristic / Sci-fi' },
    { value: 'vintage', label: 'Vintage / Classic' },
] as const

export const CAMERA_GEAR = [
    { value: 'sony-a7iv', label: 'Sony A7 IV' },
    { value: 'sony-fx3', label: 'Sony FX3' },
    { value: 'canon-eos-r5', label: 'Canon EOS R5' },
    { value: 'nikon-z9', label: 'Nikon Z9' },
    { value: 'red-komodo', label: 'RED Komodo' },
    { value: 'red-v-raptor', label: 'RED V-Raptor' },
    { value: 'arri-alexa', label: 'ARRI Alexa Mini' },
    { value: 'blackmagic-6k', label: 'Blackmagic 6K' },
    { value: 'hasselblad', label: 'Hasselblad X2D' },
    { value: 'leica-m11', label: 'Leica M11' },
    { value: 'fujifilm-x-t5', label: 'Fujifilm X-T5' },
    { value: 'iphone-15-pro', label: 'iPhone 15 Pro' },
    { value: 'gopro', label: 'GoPro Hero' },
    { value: 'medium-format', label: 'Medium Format' },
    { value: 'large-format', label: 'Large Format / 8x10' },
    { value: 'polaroid', label: 'Polaroid' },
    { value: 'disposable', label: 'Disposable / 35mm' },
] as const

export const FOCAL_LENGTHS = [
    { value: '14mm', label: '14mm — Ultra Wide' },
    { value: '24mm', label: '24mm — Wide' },
    { value: '28mm', label: '28mm — Wide' },
    { value: '35mm', label: '35mm — Classic Wide' },
    { value: '50mm', label: '50mm — Normal / Human Eye' },
    { value: '85mm', label: '85mm — Portrait' },
    { value: '100mm', label: '100mm — Macro' },
    { value: '135mm', label: '135mm — Short Telephoto' },
    { value: '200mm', label: '200mm — Telephoto' },
    { value: '400mm', label: '400mm — Super Telephoto' },
    { value: 'fisheye', label: 'Fisheye' },
    { value: 'tilt-shift', label: 'Tilt-Shift' },
] as const

export const FILM_STOCKS = [
    { value: 'portra-400', label: 'Kodak Portra 400' },
    { value: 'portra-800', label: 'Kodak Portra 800' },
    { value: 'kodachrome-64', label: 'Kodachrome 64' },
    { value: 'ektachrome', label: 'Ektachrome E100' },
    { value: 'tri-x', label: 'Kodak Tri-X 400' },
    { value: 'hp5', label: 'Ilford HP5 Plus' },
    { value: 'delta-3200', label: 'Ilford Delta 3200' },
    { value: 'fuji-provia', label: 'Fuji Provia 100F' },
    { value: 'fuji-velvia', label: 'Fuji Velvia 50' },
    { value: 'fuji-superia', label: 'Fuji Superia 400' },
    { value: 'cinestill-800t', label: 'CineStill 800T' },
    { value: 'cinestill-50d', label: 'CineStill 50D' },
    { value: 'digital-clean', label: 'Digital — Clean' },
    { value: 'digital-neutral', label: 'Digital — Neutral' },
    { value: 'digital-log', label: 'Digital — S-Log / BRAW' },
] as const

export const ASPECT_RATIOS = [
    { value: '1:1', label: '1:1 — Square', width: 1024, height: 1024 },
    { value: '16:9', label: '16:9 — Widescreen', width: 1792, height: 1024 },
    { value: '9:16', label: '9:16 — Portrait / Reel', width: 1024, height: 1792 },
    { value: '4:3', label: '4:3 — Standard', width: 1365, height: 1024 },
    { value: '3:4', label: '3:4 — Tall Standard', width: 1024, height: 1365 },
    { value: '3:2', label: '3:2 — Photo', width: 1536, height: 1024 },
    { value: '2:3', label: '2:3 — Tall Photo', width: 1024, height: 1536 },
    { value: '21:9', label: '21:9 — Ultrawide', width: 2048, height: 896 },
] as const

export type ShotType = (typeof SHOT_TYPES)[number]['value']
export type LightingOption = (typeof LIGHTING_OPTIONS)[number]['value']
export type MoodOption = (typeof MOOD_OPTIONS)[number]['value']
export type CameraGear = (typeof CAMERA_GEAR)[number]['value']
export type FocalLength = (typeof FOCAL_LENGTHS)[number]['value']
export type FilmStock = (typeof FILM_STOCKS)[number]['value']
export type AspectRatio = (typeof ASPECT_RATIOS)[number]['value']
