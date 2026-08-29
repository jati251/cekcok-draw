export interface DocumentPreset {
  name: string;
  category: 'Web' | 'Art' | 'Mobile' | 'Print';
  width: number;
  height: number;
  iconName: string;
}

export const DOCUMENT_PRESETS: DocumentPreset[] = [
  { name: 'Full HD 1080p', category: 'Web', width: 1920, height: 1080, iconName: 'Monitor' },
  { name: '4K UHD Canvas', category: 'Web', width: 3840, height: 2160, iconName: 'Monitor' },
  { name: 'Square Art 2K', category: 'Art', width: 2048, height: 2048, iconName: 'Image' },
  {
    name: 'Mobile Wallpaper',
    category: 'Mobile',
    width: 1080,
    height: 1920,
    iconName: 'Smartphone',
  },
  { name: 'Print A4 300DPI', category: 'Print', width: 2480, height: 3508, iconName: 'Printer' },
  { name: 'Social Post', category: 'Web', width: 1080, height: 1080, iconName: 'Image' },
];
