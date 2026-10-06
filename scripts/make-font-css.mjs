// Pretendard 글꼴 CSS를 font-display: optional로 바꿔 src/app/pretendard.css로 만든다 (pretendard 패키지를 올렸을 때만 다시 실행)
//   node scripts/make-font-css.mjs
// 왜: 패키지 CSS는 font-display: swap이라 글꼴이 늦게 오면 글자 폭이 바뀌며 화면이 밀린다(선생님 휴대폰 화면 CLS 0.2, 10/6 측정).
//     optional은 글꼴이 바로 오면 쓰고, 늦으면 그 화면은 기본 글꼴로 둔다(다음 방문부터는 저장된 글꼴). 밀림 0
// 글꼴 파일은 복사하지 않고 패키지 파일을 가리킨다. 빌드할 때 Next가 필요한 파일만 함께 내보낸다. 라이선스: SIL OFL
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const css = require.resolve("pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css");
const text = readFileSync(css, "utf8")
  .replace(/font-display:\s*swap/g, "font-display: optional")
  .replaceAll("./woff2-dynamic-subset/", "../../node_modules/pretendard/dist/web/variable/woff2-dynamic-subset/");
const n = (text.match(/@font-face/g) || []).length;
const optional = (text.match(/font-display: optional/g) || []).length;
if (n === 0 || optional !== n) throw new Error("글꼴 CSS 모양이 예상과 다릅니다 (pretendard 버전 확인)");
const header = "/* 자동 생성: scripts/make-font-css.mjs. Pretendard(SIL OFL) 동적 서브셋, font-display: optional (화면 밀림 방지). 직접 고치지 않는다 */\n";
writeFileSync(join(process.cwd(), "src", "app", "pretendard.css"), header + text);
console.log(`Pretendard @font-face ${n}개, font-display optional`);
