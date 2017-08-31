const jimp = require('jimp')
const fetch = require('node-fetch')
const fs = require('fs')

const flatten = (arr) => arr.reduce((a, c) => a.concat(Array.isArray(c) ? c : [c]), [])

fetch('http://services.runescape.com/m=itemdb_oldschool/api/catalogue/category.json?category=1')
  .then(res => res.json())
  .then(({types, alpha}) => {
    return map(alpha, getAlpha)
  })
  .then(items => {
    return Object.assign.apply(Object, items)
  })
  .then(all => {
    fs.writeFileSync('hashes.json', JSON.stringify(all))
  })
  .catch(console.error)

function sleep (num) {
  return new Promise(function (resolve, reject) {
    setTimeout(resolve, num)
  })
}

function map (arr, func, next = []) {
  return arr.length <= 0
    ? next
    : func(arr[0])
      .then(result => {
        return sleep(0).then(() => map(arr.slice(1), func, [...next, result]))
      })
}
function getAlpha ({letter, items}) {
  return map(Array.from({length: Math.ceil(items / 12)}, (_, i) => i + 1), getPage.bind({letter, items}))
    .then(flatten)
}

function getPage (page) {
  const {letter} = this
  return fetch(`http://services.runescape.com/m=itemdb_oldschool/api/catalogue/items.json?category=1&alpha=${encodeURIComponent(letter)}&page=${page}`)
  .then(res => {
    return res.status === 200
      ? res.json()
      : new Error('bad request')
  })
  .catch(err => {
    console.error(err)
  })
  .then((result) => {
    return map(result.items, item => {
      return fetch(item.icon)
        .then(res => res.buffer())
        .then(buffer => {
          if (buffer.length === 0) return null
          return jimp
            .read(buffer)
            .then(image => {
              return image.hash(2)
            })
            .then(hash => {
              console.log(item.id, hash)
              return { [item.id]: hash }
            })
        })
    })
  })
}
