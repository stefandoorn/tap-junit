/* Modules */
const { EOL } = require('os')
const Parser = require('tap-parser')
const path = require('path')

const serialize = require('./serialize')
const write = require('./write')

function sanitizeString (str = 'tap') {
  const { name } = path.parse(str)

  return name.replace(/[^\w-_.]/g, '').trim()
}

function generateFileName (str = 'tap') {
  const { name, ext } = path.parse(str)

  // If the file already has an extension
  // Then just clean that up and return it
  if (ext) {
    return `${sanitizeString(name)}${ext}`
  }

  // If no extension exists then clean up the string
  // Then attach the .xml to it
  return `${sanitizeString(str)}.xml`
}

/**
 * Writes the tap.xml file
 * @param  {String} xml the xml string generated by the tap-parser events
 * @param  {Boolean} passing passing boolean to let us know that the tests are passing
 */
function writeOutput (args, xml, passing) {
  const name = generateFileName(args.name)

  write(args.output, name, xml)
    .then(() => {
      console.log('Tap-Junit:', `Finished! ${name} created at -- ${args.output}${EOL}`)

      if (!passing) {
        console.error(new Error('Tap-Junit: Looks like some test suites failed'))
        process.exit(1)
      }
    }).catch(err => {
      console.error('Tap-Junit: There was an error writing the output:', err)
      process.exit(1)
    })
}

function tapJunit (args) {
  let nextCmt = ''
  let tst = { comments: '' }
  const testCases = []
  const tap = new Parser()

  /* Parser Event listening */

  // Event for each assert inside the current Test
  tap.on('assert', res => {
    tst = { comments: nextCmt, ...res }

    testCases.push(tst)
  })

  tap.on('comment', res => {
    // We don't want the failed tests count/message at the end so make sure we strip that out
    if (/failed \d of \d+ tests/.test(res)) {
      return
    }

    nextCmt = res
  })

  tap.on('complete', output => {
    const xmlString = serialize(testCases, output, args)

    // If an output is specified then let's write our results to it
    if (args.output) {
      return writeOutput(args, xmlString, output.ok)
    }

    return console.log(`${xmlString}${EOL}`)
  })

  return tap
}

module.exports = tapJunit
