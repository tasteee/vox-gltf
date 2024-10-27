import { Lexer, EmbeddedActionsParser, createToken } from 'chevrotain'

const True = createToken({ name: 'True', pattern: /true/ })
const False = createToken({ name: 'False', pattern: /false/ })
const Identifier = createToken({ name: 'Identifier', pattern: /[a-zA-Z_][a-zA-Z0-9_]*/ })
const HexLiteral = createToken({ name: 'HexLiteral', pattern: /0x[0-9A-Fa-f]+/ })
const Colon = createToken({ name: 'Colon', pattern: /:/ })
const LCurly = createToken({ name: 'LCurly', pattern: /{/ })
const RCurly = createToken({ name: 'RCurly', pattern: /}/ })

const StringLiteral = createToken({
  name: 'StringLiteral',
  pattern: /"(?:[^\\"]|\\(?:[bfnrtv"\\/]|u[0-9a-fA-F]{4}))*"/
})

const NumberLiteral = createToken({
  name: 'NumberLiteral',
  pattern: /-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/
})

const WhiteSpace = createToken({
  name: 'WhiteSpace',
  pattern: /\s+/,
  group: Lexer.SKIPPED
})

const tokens = [WhiteSpace, True, False, Identifier, HexLiteral, StringLiteral, NumberLiteral, Colon, LCurly, RCurly]

const RoomLexer = new Lexer(tokens)
const parserConstructorOptions = { recoveryEnabled: true, outputCst: false }

class RoomParser extends EmbeddedActionsParser {
  constructor() {
    super(tokens, parserConstructorOptions)
    const self = this

    self.RULE('config', () => {
      const configuration = {}

      self.MANY(() => {
        Object.assign(configuration, self.SUBRULE(self.pair))
      })

      return configuration
    })

    self.RULE('pair', () => {
      const pairs = {}
      const key = self.CONSUME(Identifier).image
      self.CONSUME(Colon)
      const value = self.SUBRULE(self.value)
      pairs[key] = value
      return pairs
    })

    self.RULE('object', () => {
      const target = {}
      self.CONSUME(LCurly)

      self.MANY(() => {
        Object.assign(target, self.SUBRULE(self.pairOrChildren))
      })

      self.CONSUME(RCurly)
      return target
    })

    self.RULE('pairOrChildren', () => {
      const pairs = {}
      const key = self.CONSUME(Identifier).image
      self.CONSUME(Colon)
      const isKeyChildren = key === 'children'
      const value = isKeyChildren ? self.SUBRULE(self.children) : self.SUBRULE(self.value)
      pairs[key] = value
      return pairs
    })

    self.RULE('children', () => {
      const children = []
      self.CONSUME(LCurly)

      self.MANY(() => {
        children.push(self.SUBRULE(self.object))
      })

      self.CONSUME(RCurly)
      return children
    })

    self.RULE('value', () => {
      return self.OR([
        { ALT: () => self.CONSUME(StringLiteral).image.slice(1, -1) },
        { ALT: () => Number(self.CONSUME(NumberLiteral).image) },
        { ALT: () => self.CONSUME(HexLiteral).image },
        { ALT: () => self.SUBRULE(self.object) },
        {
          ALT: () => {
            self.CONSUME(True)
            return true
          }
        },
        {
          ALT: () => {
            self.CONSUME(False)
            return false
          }
        }
      ])
    })

    this.performSelfAnalysis()
  }
}

export const lexer = RoomLexer
export const parser = new RoomParser()

const convert = (data) => {
  const lexingResult = lexer.tokenize(data)
  parser.input = lexingResult.tokens
  const json = parser.config()
  return json
}

export const interpreter = {
  lexer,
  parser,
  convert
}
