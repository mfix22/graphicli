// Native
const fs = require('fs')
const path = require('path')

// Packages
const chalk = require('chalk')

exports.encode = query => ({
  query: query.replace(/\s+/ig, ' ').replace(/"/ig, `\\"`).trim().toString()
})

exports.readFile = path =>
  new Promise((resolve, reject) =>
    fs.readFile(path, 'utf8', (err, data) =>
      err ? reject(err) : resolve(data)))

exports.checkPath = path =>
  new Promise((resolve, reject) =>
    fs.stat(path, (err, stats) =>
      err ? reject(err) : resolve(path)))

const pullHeaders = (header) => {
  if (!header) return undefined
  if (typeof header === 'string') {
    const [key, value] = header.split('=')
    return { [key]: value }
  }
  return header.reduce((accum, next) => {
    const [key, value] = next.split('=')
    accum[key] = value
    return accum
  }, {})
}

// JSON.parse(JSON.stringify(obj)) removes undefined keys
exports.flagsToOptions = ({baseUrl, schema, header} = {}) =>
  JSON.parse(JSON.stringify({
    baseURL: Array.isArray(baseUrl) ? baseUrl[0] : baseUrl,
    schema: Array.isArray(schema) ? schema[0] : schema,
    headers: pullHeaders(header)
  }))

exports.correctURL = (url) => {
  if (/(https?:\/\/)[\w-]+(\.[a-z-]+)+\.?(:\d+)?(\/\S*)?/i.test(url)) return url
  if (/[\w-]+(\.[a-z-]+)+\.?(:\d+)?(\/\S*)?/i.test(url)) return `https://${url}`
  if (/(http:\/\/)?localhost:\d\d\d\d/i.test(url)) return url
  throw new Error('Your `baseURL` must be a valid URL.')
}

exports.colorResponse = (res) => {
  const out = []

  if (res.data) {
    out.push(`${JSON.stringify({ data: res.data }, null, 2)
      .replace(/data/i, chalk.green.bold('$&'))
      .replace(/\\"/ig, `"`)}`)
    if (res.errors) out.push('')
  }

  if (res.errors) {
    out.push(
      chalk.red.bold.underline('Errors'),
      ...res.errors.map(e => `${chalk.dim('-')} ${e.message.replace(/Did you mean ".+?"/ig, chalk.yellow.bold('$&'))}`)
    )
  }

  return out.join('\n')
}

exports.colorizeGraphQL = message => message
  .replace(/type/g, chalk.dim.gray('$&'))
  .replace(/\w+:/g, chalk.bold.magenta('$&'))
  .replace(/\s+\w+/g, chalk.cyan('$&'))
  .replace(/(Query|Mutation|:)/g, chalk.white('$&'))

exports.errorMessage = (e) => {
  switch (e.code) {
    case 'MODULE_NOT_FOUND': return `
Schema not found. Trying running \`${chalk.yellow.bold('gest --schema ./path/to/schema.js')}\`
or with \`schema.js\` in the current working directory.
`
    default: return e
  }
}

const checkFileName = (name, regex, file) => {
  const newFile = path.join(name, file)
  if (file === 'node_modules' || file === '.git') return
  return new Promise((resolve, reject) => {
    fs.stat(newFile, (err, stats) => {
      if (err) return reject(err)
      if (stats && stats.isDirectory()) return resolve(readDir(newFile, regex))
      if (regex.test(newFile)) return resolve(newFile)
      return resolve()
    })
  })
}

// regex defaults to empty
function readDir (dir, regex = /^(?:)$/) {
  return new Promise((resolve, reject) =>
    fs.readdir(dir, (err, files) => err
      ? reject(err)
      : resolve(Promise.all(files.map(checkFileName.bind(null, dir, regex))))))
    .then(values =>
      [].concat(...values)
        .filter(i => i))
}

exports.readDir = readDir
