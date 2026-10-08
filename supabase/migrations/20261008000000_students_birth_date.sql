-- 학생 생년월일 (STU-01, 10/8 여유 작업 A3). 빈 칸이어도 된다 (에듀OK 명단에 없는 학생)
-- 표 단위 권한·RLS가 그대로 적용된다: 원장님 전체, 선생님 담당 반 학생, 학생 본인, 학부모 자녀 (열 단위 grant 없음)
-- 미래 날짜는 화면 입력 검사에서 막는다 (CHECK에 current_date를 쓰면 날짜가 바뀔 때 기존 행이 어긋날 수 있다)
alter table public.students
  add column birth_date date check (birth_date >= date '1950-01-01');

comment on column public.students.birth_date is '생년월일 (STU-01). 없으면 null';
