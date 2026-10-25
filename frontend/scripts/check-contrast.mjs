import { readFile, writeFile } from 'node:fs/promises';
const css = await readFile(new URL('../src/assets/styles/variables.css', import.meta.url), 'utf8');
const colors = Object.fromEntries([...css.matchAll(/(--[\w-]+):\s*(#[\da-f]{6})(?=[;\s])/gi)].map(match => [match[1], match[2]]));
function luminance(hex) {
  const rgb = [1,3,5].map(start => parseInt(hex.slice(start,start + 2),16)/255).map(value => value <= .04045 ? value/12.92 : ((value + .055)/1.055)**2.4);
  return .2126*rgb[0] + .7152*rgb[1] + .0722*rgb[2];
}
const pairs = [
  ['--ink','--paper',4.5], ['--muted','--paper',4.5], ['--muted','--surface',4.5],
  ['--vermilion','--paper',4.5], ['--vermilion','--paper-deep',4.5], ['--on-dark','--forest',4.5],
  ['--on-dark','--vermilion',4.5], ['--dark-muted','--forest',4.5], ['--accent-bright','--ink',4.5],
  ['--error','--error-bg',4.5], ['--success','--success-bg',4.5],
  ['--control-border','--surface',3], ['--control-border','--paper',3],
  ['--focus-light','--forest',3], ['--ink','--surface',3],
];
const results = pairs.map(([foreground,background,minimum]) => {
  const values = [luminance(colors[foreground]),luminance(colors[background])].sort((a,b) => b-a);
  const ratio = (values[0] + .05)/(values[1] + .05);
  return { foreground, background, ratio: Number(ratio.toFixed(2)), minimum, pass: ratio >= minimum };
});
console.table(results);
await writeFile(new URL('../../diseño/contraste.json',import.meta.url), JSON.stringify({ method:'WCAG sRGB relative luminance', results },null,2) + '\n');
if (results.some(result => !result.pass)) process.exitCode = 1;
