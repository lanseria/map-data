import * as fs from 'node:fs'
import * as https from 'node:https'
import * as path from 'node:path'

const fileUrls = ['https://raw.githubusercontent.com/modood/Administrative-divisions-of-China/master/dist/provinces.json', 'https://raw.githubusercontent.com/modood/Administrative-divisions-of-China/master/dist/cities.json']
const filePaths = ['resource/provinces.json', 'resource/cities.json']

export function createDirectory(dirPath: string) {
  return new Promise<void>((resolve, reject) => {
    fs.mkdir(dirPath, { recursive: true }, (error) => {
      if (error)
        reject(error)
      else
        resolve()
    })
  })
}

function downloadFile(url: string, dest: string) {
  return new Promise<void>((resolve, reject) => {
    const file = fs.createWriteStream(dest)
    https.get(url, (response) => {
      response.pipe(file)
      file.on('finish', () => {
        file.close()
        resolve()
      })
    }).on('error', (error) => {
      fs.unlink(dest, () => {
        reject(error)
      })
    })
  })
}

const directoryPath = path.dirname(filePaths[0])
createDirectory(directoryPath)
  .then(async () => {
    await downloadFile(fileUrls[0], filePaths[0])
    await downloadFile(fileUrls[1], filePaths[1])
  })
  .then(() => {
    console.warn('File downloaded successfully.')
  })
  .catch((error) => {
    console.error('File download failed:', error)
  })
