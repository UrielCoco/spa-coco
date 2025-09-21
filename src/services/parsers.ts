export function parseSpaResponse(text: string) {
try {
const jsonStart = text.indexOf('{');
if (jsonStart === -1) return null;
const json = JSON.parse(text.slice(jsonStart));
return json;
} catch (e) {
console.warn('Failed to parse assistant response', e);
return null;
}
}