// 재원생 정렬 (STU-06, 10/8): 이름 가나다, 출결 번호, 입학일

export type SortKey = "name" | "attendanceCode" | "enrolledOn";
export type SortDir = "asc" | "desc";
export type Sort = { key: SortKey; dir: SortDir };

export const DEFAULT_SORT: Sort = { key: "name", dir: "asc" };

/** 휴대폰·태블릿 정렬 선택칸 (PC는 표 머리글을 누른다) */
export const SORT_OPTIONS: { value: string; label: string; sort: Sort }[] = [
  { value: "name-asc", label: "이름순", sort: { key: "name", dir: "asc" } },
  { value: "attendanceCode-asc", label: "출결 번호순", sort: { key: "attendanceCode", dir: "asc" } },
  { value: "enrolledOn-desc", label: "최근 입학순", sort: { key: "enrolledOn", dir: "desc" } },
  { value: "enrolledOn-asc", label: "오래된 입학순", sort: { key: "enrolledOn", dir: "asc" } },
];

type Sortable = { id: string; name: string; attendanceCode: string; enrolledOn: string };

const ko = new Intl.Collator("ko");

/** 정렬한 새 배열. 같은 값이면 이름 → id 순 (동명이인도 늘 같은 순서) */
export function sortStudents<T extends Sortable>(rows: readonly T[], { key, dir }: Sort): T[] {
  const sign = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const main = key === "name" ? ko.compare(a.name, b.name) : a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0;
    if (main !== 0) return main * sign;
    return ko.compare(a.name, b.name) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  });
}

/** 머리글을 눌렀을 때: 같은 열이면 방향을 뒤집고, 다른 열이면 그 열의 기본 방향(입학일은 최근부터) */
export function nextSort(current: Sort, key: SortKey): Sort {
  if (current.key === key) return { key, dir: current.dir === "asc" ? "desc" : "asc" };
  return { key, dir: key === "enrolledOn" ? "desc" : "asc" };
}
