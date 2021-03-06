const _ = require('lodash')
const fs = require('fs')
const { abi } = require('@airswap/indexer/build/contracts/Index')

const overwrites = [
  {
    inputs: [
      {
        name: 'identifier',
      },
    ],
    name: 'entries',
  },
]

const newAbi = _.map(abi, abiItem => {
  const overwriteItem = _.find(overwrites, o => o.name === abiItem.name)
  const newItem = _.merge(abiItem, overwriteItem)

  return newItem
})

fs.writeFileSync(`abis/index.json`, JSON.stringify(newAbi, null, 2))

module.exports = {}
