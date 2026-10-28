import { parseDocument } from 'htmlparser2'
import { selectAll, selectOne } from 'css-select'
import { textContent } from 'domutils'
import { isTag, type AnyNode, type ParentNode } from 'domhandler'

// Only expose the read-only DOM operations used by background features.
// This parser runs in service workers, never executes scripts, and needs no eval.
export class ParsedHTML {
  constructor(private readonly node: ParentNode) {}

  querySelector(selector: string): ParsedHTML | null {
    const result = selectOne(selector, this.node.children)
    return result && isTag(result) ? new ParsedHTML(result) : null
  }

  querySelectorAll(selector: string): ParsedHTML[] {
    return selectAll(selector, this.node.children)
      .filter(isTag)
      .map((node) => new ParsedHTML(node))
  }

  getAttribute(name: string): string | null {
    return isTag(this.node) ? (this.node.attribs[name] ?? null) : null
  }

  get textContent(): string {
    return textContent(this.node as AnyNode)
  }
  get children(): ParsedHTML[] {
    return this.node.children.filter(isTag).map((node) => new ParsedHTML(node))
  }
  get body(): ParsedHTML {
    return this.querySelector('body') || this
  }
}

export default function parseBackgroundHTML(html: string): ParsedHTML {
  return new ParsedHTML(parseDocument(html))
}
