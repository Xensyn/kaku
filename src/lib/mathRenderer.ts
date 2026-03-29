// Rendu des formules mathématiques LaTeX avec KaTeX

import katex from 'katex'

/**
 * Transforme les formules LaTeX ($...$ et $$...$$) dans une chaîne HTML
 * en les remplaçant par le rendu KaTeX correspondant.
 */
export function renderMathInHtml(html: string): string {
  // Traiter les blocs $$...$$ (display mode) en premier
  let result = html.replace(/\$\$([^$]+?)\$\$/gs, (_match, math: string) => {
    try {
      return katex.renderToString(math.trim(), { displayMode: true, throwOnError: false })
    } catch {
      return `<span class="math-error">$$${math}$$</span>`
    }
  })

  // Traiter les inline $...$ (éviter $$)
  result = result.replace(/\$([^$\n]+?)\$/g, (_match, math: string) => {
    try {
      return katex.renderToString(math.trim(), { displayMode: false, throwOnError: false })
    } catch {
      return `<span class="math-error">$${math}$</span>`
    }
  })

  return result
}
