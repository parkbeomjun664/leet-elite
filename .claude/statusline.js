// Claude Code status line: "<model> · ctx <pct>%"
let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () => {
  let out = "Claude";
  try {
    const d = JSON.parse(raw || "{}");
    const model = (d.model && (d.model.display_name || d.model.id)) || "Claude";
    let pct = d.context_window && d.context_window.used_percentage;
    if (typeof pct !== "number") pct = null;
    out = model + " · ctx " + (pct === null ? "--" : Math.round(pct) + "%");
  } catch (e) {
    // fall through to fallback
  }
  process.stdout.write(out + "\n");
});
process.stdin.on("error", () => process.stdout.write("Claude\n"));
