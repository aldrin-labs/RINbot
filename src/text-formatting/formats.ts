export function b(text: string) {
  return `<b>${text}</b>`;
}

export function c(text: string) {
  return `<code>${text}</code>`;
}

export function ib(text: string) {
  return `<i><b>${text}</b></i>`;
}

export function i(text: string) {
  return `<i>${text}</i>`;
}

export function a(text: string, url: string) {
  return `<a href="${url}">${text}</a>`;
}

export function s(text: string) {
  return `<span class="tg-spoiler">${text}</span>`;
}

export function u(text: string) {
  return `<u>${text}</u>`;
}
