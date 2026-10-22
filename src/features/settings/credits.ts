export interface AssetCredit {
  name: string
  author: string
  license?: string
  licenseKey?: string
  url: string
}

export const ASSET_CREDITS: AssetCredit[] = [
  {
    name: 'Sweetie 16',
    author: 'GrafxKid',
    licenseKey: 'settings.creditsCourtesy',
    url: 'https://lospec.com/palette-list/sweetie-16',
  },
  {
    name: 'Pixelify Sans',
    author: 'Stefie Justprince',
    license: 'SIL Open Font License 1.1',
    url: 'https://fonts.google.com/specimen/Pixelify+Sans',
  },
]
