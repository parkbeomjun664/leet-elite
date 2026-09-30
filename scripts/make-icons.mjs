// 원장님 로고(흰 배경 A4 이미지)로 앱 아이콘들을 만든다.
// 실행: node scripts/make-icons.mjs
//
// 1) 바깥쪽 흰 배경만 투명하게 (로고 안의 흰 글자는 그대로) → 테두리에서부터 이어진 흰색만 지운다
// 2) 여백을 잘라 로고만 남김 → public/brand/leet-mark.png
// 3) 정사각형 아이콘: 앱 설치용(192, 512), 마스커블(안드로이드 모양 잘림 대비), 아이폰(180), 브라우저 탭(32)

import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const SRC = "public/brand/leet-logo.png";
const WHITE = 240; // 이 값보다 밝으면 흰 배경으로 본다

async function transparentMark() {
  const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const isWhite = (i) => data[i * 4] >= WHITE && data[i * 4 + 1] >= WHITE && data[i * 4 + 2] >= WHITE;

  // 테두리에서 시작해 이어진 흰 픽셀만 투명하게 (flood fill)
  const seen = new Uint8Array(w * h);
  const stack = [];
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
  while (stack.length) {
    const i = stack.pop();
    if (seen[i] || !isWhite(i)) continue;
    seen[i] = 1;
    data[i * 4 + 3] = 0;
    const x = i % w;
    if (x > 0) stack.push(i - 1);
    if (x < w - 1) stack.push(i + 1);
    if (i >= w) stack.push(i - w);
    if (i < w * (h - 1)) stack.push(i + w);
  }

  return sharp(data, { raw: { width: w, height: h, channels: 4 } }).trim().png().toBuffer();
}

/** 로고를 정사각형 가운데에 놓는다. scale = 아이콘에서 로고가 차지하는 높이 비율 */
async function square(mark, size, { scale, background }) {
  const inner = Math.round(size * scale);
  const resized = await sharp(mark).resize({ height: inner, width: inner, fit: "inside" }).toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: resized, gravity: "center" }])
    .png();
}

const white = { r: 255, g: 255, b: 255, alpha: 1 };

await mkdir("public/icons", { recursive: true });
const mark = await transparentMark();
await sharp(mark).resize({ height: 512 }).png().toFile("public/brand/leet-mark.png");

await (await square(mark, 192, { scale: 0.78, background: white })).toFile("public/icons/icon-192.png");
await (await square(mark, 512, { scale: 0.78, background: white })).toFile("public/icons/icon-512.png");
// 마스커블: 안드로이드가 원·둥근 사각형으로 잘라도 로고가 남도록 가운데 60%만 사용
await (await square(mark, 512, { scale: 0.6, background: white })).toFile("public/icons/icon-maskable-512.png");
// Next.js 규칙: src/app/apple-icon.png, src/app/icon.png 는 자동으로 <link> 가 붙는다
await (await square(mark, 180, { scale: 0.78, background: white })).toFile("src/app/apple-icon.png");
await (await square(mark, 64, { scale: 0.9, background: { r: 0, g: 0, b: 0, alpha: 0 } })).toFile("src/app/icon.png");

console.log("아이콘 생성 완료");
