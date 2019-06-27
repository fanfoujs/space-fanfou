import parseFilename from './parseFilename'

test('parseFilename', () => {
  expect(parseFilename('abc.edf')).toEqual({
    basename: 'abc',
    extname: '.edf',
  })
  expect(parseFilename('abc')).toEqual({
    basename: 'abc',
    extname: '',
  })
})
