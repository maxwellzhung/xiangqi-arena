const pieces = [
  ["black", "R", 0, 0],
  ["black", "H", 1, 0],
  ["black", "E", 2, 0],
  ["black", "G", 4, 0],
  ["black", "C", 1, 2],
  ["black", "S", 4, 3],
  ["red", "S", 4, 6],
  ["red", "C", 7, 7],
  ["red", "G", 4, 9],
  ["red", "E", 6, 9],
  ["red", "H", 7, 9],
  ["red", "R", 8, 9],
] as const;

export function MiniBoard() {
  return (
    <div className="mini-board-wrap" aria-hidden="true">
      <div className="mini-board">
        <span className="river">楚河&nbsp;&nbsp; RIVER &nbsp;&nbsp;漢界</span>
        <i className="palace palace-top" />
        <i className="palace palace-bottom" />
        {pieces.map(([color, label, column, row], index) => (
          <span
            key={`${color}-${label}-${index}`}
            className={`mini-piece ${color}`}
            style={{
              left: `${(column / 8) * 100}%`,
              top: `${(row / 9) * 100}%`,
            }}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
