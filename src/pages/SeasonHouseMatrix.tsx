import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Download, Lock, Settings2 } from 'lucide-react';
import {
  addMemberManagerNote,
  deleteMemberManagerNote,
  getSeasonHouseMatrix,
  listMemberManagerNotes,
  managerCancelOverride,
  reviewGuestReservation,
  updateSeasonHousePolicy,
  upsertStayCharge,
  type DayOfWeek,
  type GuestApprovalMode,
  type GuestMatrixRow,
  type ManagerNoteCategory,
  type ManagerNoteView,
  type MatrixCellView,
  type MatrixDayColumn,
  type MemberMatrixRow,
  type SeasonHouseMatrixView,
  type StayChargeStatus,
} from '../services/seasonHouseMatrix';
import { completeStay } from '../services/seasonStays';
import { getApiErrorMessage } from '../lib/apiError';
import './SeasonHouseMatrix.css';

interface SeasonHouseMatrixProps {
  crewId: number;
  onBack: () => void;
}

const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'] as const;
const DAY_OF_WEEK_KO: Record<DayOfWeek, string> = {
  SUNDAY: '일',
  MONDAY: '월',
  TUESDAY: '화',
  WEDNESDAY: '수',
  THURSDAY: '목',
  FRIDAY: '금',
  SATURDAY: '토',
};

const CHARGE_STATUS_LABELS: Record<StayChargeStatus, string> = {
  UNPAID: '미입금',
  PAID: '입금완료',
  WAIVED: '면제',
  REFUNDED: '환불',
};

const RESERVATION_STATUS_LABELS: Record<MatrixCellView['status'], string> = {
  PENDING_APPROVAL: '승인 대기',
  CONFIRMED: '예약 확정',
  WAITING: '대기',
  CANCELED: '취소됨',
  REJECTED: '반려됨',
};

const GUEST_APPROVAL_MODE_LABELS: Record<GuestApprovalMode, string> = {
  INVITE_REQUIRED: '크루원 초대 필수',
  INVITE_WITH_MANAGER_APPROVAL: '초대 + 운영진 승인',
  OPEN_LINK: '인증 링크 자유 신청',
};

const NOTE_CATEGORY_LABELS: Record<ManagerNoteCategory, string> = {
  PENALTY: '벌점',
  CLEANING: '청소',
  FACILITY: '시설',
  GENERAL: '일반',
};

function monthBounds(year: number, monthIndex: number): { from: string; to: string; label: string } {
  const mm = String(monthIndex + 1).padStart(2, '0');
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  return {
    from: `${year}-${mm}-01`,
    to: `${year}-${mm}-${String(lastDay).padStart(2, '0')}`,
    label: `${year}년 ${monthIndex + 1}월`,
  };
}

function todayIsoLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function attachLightDismissFallback(dialog: HTMLDialogElement | null) {
  if (!dialog || 'closedBy' in HTMLDialogElement.prototype) return () => {};
  const handler = (event: MouseEvent) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    const inside =
      rect.top <= event.clientY &&
      event.clientY <= rect.top + rect.height &&
      rect.left <= event.clientX &&
      event.clientX <= rect.left + rect.width;
    if (!inside) dialog.close();
  };
  dialog.addEventListener('click', handler);
  return () => dialog.removeEventListener('click', handler);
}

export default function SeasonHouseMatrix({ crewId, onBack }: SeasonHouseMatrixProps) {
  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [monthIndex, setMonthIndex] = useState(today.getMonth());
  const [weekStart, setWeekStart] = useState<0 | 1>(1); // 1 = Mon-Sun (default), 0 = Sun-Sat
  const [scope, setScope] = useState<'all' | 'crew' | 'guest' | 'unpaid'>('all');
  const [showEvents, setShowEvents] = useState(true);
  const [search, setSearch] = useState('');

  const [matrix, setMatrix] = useState<SeasonHouseMatrixView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  // Selected cell modal state (1.2 + 1.3 + 1.5)
  const [selectedCell, setSelectedCell] = useState<{
    kind: 'MEMBER' | 'GUEST';
    name: string;
    date: string;
    day: MatrixDayColumn;
    cell: MatrixCellView;
  } | null>(null);
  const [cellAmount, setCellAmount] = useState('0');
  const [cellPayStatus, setCellPayStatus] = useState<StayChargeStatus>('UNPAID');
  const [cellDepositor, setCellDepositor] = useState('');
  const [cellNote, setCellNote] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [cellBusy, setCellBusy] = useState(false);

  // Selected member modal state (1.3 pass charge + 1.6 private notes)
  const [selectedMember, setSelectedMember] = useState<MemberMatrixRow | null>(null);
  const [memberNotes, setMemberNotes] = useState<ManagerNoteView[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [passAmount, setPassAmount] = useState('0');
  const [passPayStatus, setPassPayStatus] = useState<StayChargeStatus>('UNPAID');
  const [passDepositor, setPassDepositor] = useState('');
  const [newNoteCategory, setNewNoteCategory] = useState<ManagerNoteCategory>('GENERAL');
  const [newNoteDate, setNewNoteDate] = useState<string>(() => todayIsoLocal());
  const [newNotePenalty, setNewNotePenalty] = useState('0');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [memberBusy, setMemberBusy] = useState(false);

  // Policy modal state (1.1 + 1.2 + 1.5)
  const [policyOpen, setPolicyOpen] = useState(false);
  const [policyAlwaysOpen, setPolicyAlwaysOpen] = useState(false);
  const [policyOpenDay, setPolicyOpenDay] = useState<DayOfWeek>('WEDNESDAY');
  const [policyOpenTime, setPolicyOpenTime] = useState('20:00');
  const [policyOffsetDays, setPolicyOffsetDays] = useState('7');
  const [policyWindowDays, setPolicyWindowDays] = useState('7');
  const [policyCutoffOffset, setPolicyCutoffOffset] = useState('0');
  const [policyCutoffTime, setPolicyCutoffTime] = useState('04:00');
  const [policyGuestEnabled, setPolicyGuestEnabled] = useState(true);
  const [policyGuestMode, setPolicyGuestMode] = useState<GuestApprovalMode>('INVITE_REQUIRED');
  const [policyGuestCap, setPolicyGuestCap] = useState('');
  const [policyGuestFee, setPolicyGuestFee] = useState('0');
  const [policyBusy, setPolicyBusy] = useState(false);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const cellDialogRef = useRef<HTMLDialogElement>(null);
  const memberDialogRef = useRef<HTMLDialogElement>(null);
  const policyDialogRef = useRef<HTMLDialogElement>(null);

  const { from, to, label: monthLabel } = useMemo(() => monthBounds(year, monthIndex), [year, monthIndex]);

  const loadMatrix = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getSeasonHouseMatrix(crewId, from, to);
      setMatrix(data);
    } catch (err) {
      setError(getApiErrorMessage(err) || '시즌방 매트릭스를 불러오지 못했습니다. 운영진 권한을 확인해 주세요.');
    } finally {
      setLoading(false);
    }
  }, [crewId, from, to]);

  useEffect(() => {
    void loadMatrix();
  }, [loadMatrix]);

  // Safari fallback for native <dialog closedby="any">
  useEffect(() => attachLightDismissFallback(cellDialogRef.current), []);
  useEffect(() => attachLightDismissFallback(memberDialogRef.current), []);
  useEffect(() => attachLightDismissFallback(policyDialogRef.current), []);

  // Scrollability affordance fallback via IntersectionObserver when scroll-state container queries are unsupported
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || !matrix) return;
    if (typeof CSS !== 'undefined' && CSS.supports?.('container-type', 'scroll-state')) return;
    if (typeof IntersectionObserver === 'undefined') return;
    const firstDayHead = scroller.querySelector('th[data-day-col]');
    const firstRow = scroller.querySelector('tbody tr:first-child');
    const lastRow = scroller.querySelector('tbody tr:last-child');
    if (!firstDayHead || !firstRow || !lastRow) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const { target, intersectionRatio } of entries) {
          if (target === firstDayHead) scroller.classList.toggle('more-inline-start', intersectionRatio < 1);
          if (target === firstRow) scroller.classList.toggle('more-block-start', intersectionRatio < 1);
          if (target === lastRow) scroller.classList.toggle('more-block-end', intersectionRatio < 1);
        }
      },
      { root: scroller, threshold: 1, rootMargin: '1px' },
    );
    observer.observe(firstDayHead);
    observer.observe(firstRow);
    observer.observe(lastRow);
    return () => observer.disconnect();
  }, [matrix, scope, search]);

  // Group day columns into weeks for alternating week band shading
  const weekStructure = useMemo(() => {
    if (!matrix) return { daysWithWeek: [], weeks: [] };
    const daysWithWeek: Array<MatrixDayColumn & { dow: number; weekday: string; dayNum: number; weekIdx: number; isWeekStart: boolean }> = [];
    const weeks: Array<{ weekIdx: number; label: string; days: typeof daysWithWeek }> = [];
    let weekIdx = 0;

    matrix.days.forEach((col, idx) => {
      const dt = parseIsoDate(col.date);
      const dow = dt.getDay();
      const isWeekStart = idx === 0 || dow === weekStart;
      if (idx > 0 && dow === weekStart) weekIdx += 1;
      const item = {
        ...col,
        dow,
        weekday: WEEKDAY_KO[dow],
        dayNum: dt.getDate(),
        weekIdx,
        isWeekStart,
      };
      daysWithWeek.push(item);
      if (!weeks[weekIdx]) {
        weeks[weekIdx] = { weekIdx, label: `${weekIdx + 1}주차`, days: [] };
      }
      weeks[weekIdx].days.push(item);
    });
    return { daysWithWeek, weeks };
  }, [matrix, weekStart]);

  const filteredMembers = useMemo(() => {
    if (!matrix || scope === 'guest') return [];
    const q = search.trim().toLowerCase();
    return [...matrix.members]
      .sort((a, b) => a.name.localeCompare(b.name, 'ko-KR'))
      .filter((m) => {
        if (q && !m.name.toLowerCase().includes(q) && !(m.studentNumber || '').toLowerCase().includes(q)) return false;
        if (scope === 'unpaid') {
          const passUnpaid = m.pass?.passCharge?.paymentStatus === 'UNPAID';
          const stayUnpaid = Object.values(m.cells).some((c) => c.usageCharge?.paymentStatus === 'UNPAID');
          return passUnpaid || stayUnpaid;
        }
        return true;
      });
  }, [matrix, scope, search]);

  const filteredGuests = useMemo(() => {
    if (!matrix || scope === 'crew') return [];
    const q = search.trim().toLowerCase();
    return [...matrix.guests]
      .sort((a, b) => a.name.localeCompare(b.name, 'ko-KR'))
      .filter((g) => {
        if (q && !g.name.toLowerCase().includes(q) && !g.invitedByName.toLowerCase().includes(q)) return false;
        if (scope === 'unpaid') {
          return Object.values(g.cells).some((c) => c.usageCharge?.paymentStatus === 'UNPAID');
        }
        return true;
      });
  }, [matrix, scope, search]);

  const kpis = useMemo(() => {
    if (!matrix) return { totalNights: 0, guestNights: 0, unpaidCharges: 0, noteMembers: 0 };
    let totalNights = 0;
    let guestNights = 0;
    let unpaidCharges = 0;
    let noteMembers = 0;
    matrix.members.forEach((m) => {
      if (m.noteCount > 0 || m.penaltyPoints !== 0) noteMembers += 1;
      if (m.pass?.passCharge?.paymentStatus === 'UNPAID') unpaidCharges += 1;
      Object.values(m.cells).forEach((c) => {
        if (c.status === 'CONFIRMED') totalNights += 1;
        if (c.usageCharge?.paymentStatus === 'UNPAID') unpaidCharges += 1;
      });
    });
    matrix.guests.forEach((g) => {
      Object.values(g.cells).forEach((c) => {
        if (c.status === 'CONFIRMED') {
          totalNights += 1;
          guestNights += 1;
        }
        if (c.usageCharge?.paymentStatus === 'UNPAID') unpaidCharges += 1;
      });
    });
    return { totalNights, guestNights, unpaidCharges, noteMembers };
  }, [matrix]);

  const shiftMonth = (delta: number) => {
    const next = new Date(year, monthIndex + delta, 1);
    setYear(next.getFullYear());
    setMonthIndex(next.getMonth());
  };

  const openCellModal = (kind: 'MEMBER' | 'GUEST', name: string, day: MatrixDayColumn, cell: MatrixCellView) => {
    setSelectedCell({ kind, name, date: day.date, day, cell });
    setCellAmount(String(cell.usageCharge?.amountKrw ?? (kind === 'GUEST' ? matrix?.policy.guestPerNightFeeKrw ?? 0 : 0)));
    setCellPayStatus(cell.usageCharge?.paymentStatus ?? 'UNPAID');
    setCellDepositor(cell.usageCharge?.depositorName ?? '');
    setCellNote(cell.usageCharge?.note ?? '');
    setOverrideReason('');
    cellDialogRef.current?.showModal();
  };

  const openMemberModal = async (member: MemberMatrixRow) => {
    setSelectedMember(member);
    setPassAmount(String(member.pass?.passCharge?.amountKrw ?? 0));
    setPassPayStatus(member.pass?.passCharge?.paymentStatus ?? 'UNPAID');
    setPassDepositor(member.pass?.passCharge?.depositorName ?? '');
    setNewNoteCategory('GENERAL');
    setNewNotePenalty('0');
    setNewNoteContent('');
    memberDialogRef.current?.showModal();
    setNotesLoading(true);
    try {
      setMemberNotes(await listMemberManagerNotes(crewId, member.membershipId));
    } catch {
      setMemberNotes([]);
    } finally {
      setNotesLoading(false);
    }
  };

  const openPolicyModal = () => {
    if (!matrix) return;
    const p = matrix.policy;
    setPolicyAlwaysOpen(!p.openDayOfWeek || !p.openTimeKst);
    setPolicyOpenDay(p.openDayOfWeek ?? 'WEDNESDAY');
    setPolicyOpenTime((p.openTimeKst ?? '20:00:00').slice(0, 5));
    setPolicyOffsetDays(String(p.openOffsetDays));
    setPolicyWindowDays(String(p.bookingWindowDays));
    setPolicyCutoffOffset(String(p.cancelCutoffDayOffset));
    setPolicyCutoffTime((p.cancelCutoffTimeKst ?? '04:00:00').slice(0, 5));
    setPolicyGuestEnabled(p.guestEnabled);
    setPolicyGuestMode(p.guestApprovalMode);
    setPolicyGuestCap(p.guestDailyCapacity != null ? String(p.guestDailyCapacity) : '');
    setPolicyGuestFee(String(p.guestPerNightFeeKrw));
    setPolicyOpen(true);
    policyDialogRef.current?.showModal();
  };

  const handleSaveCellCharge = async () => {
    if (!selectedCell) return;
    setCellBusy(true);
    try {
      await upsertStayCharge(crewId, {
        chargeKind: 'STAY_USAGE_FEE',
        reservationId: selectedCell.cell.reservationId,
        amountKrw: Math.max(0, Number(cellAmount) || 0),
        paymentStatus: cellPayStatus,
        depositorName: cellDepositor.trim() || null,
        note: cellNote.trim() || null,
      });
      cellDialogRef.current?.close();
      setStatusMessage('예약 실제 이용금 정산 정보를 저장했습니다.');
      await loadMatrix();
    } catch (err) {
      setError(getApiErrorMessage(err) || '정산 정보를 저장하지 못했습니다.');
    } finally {
      setCellBusy(false);
    }
  };

  const handleToggleCompleted = async () => {
    if (!selectedCell) return;
    setCellBusy(true);
    try {
      await completeStay(crewId, selectedCell.cell.reservationId, !selectedCell.cell.stayCompleted);
      cellDialogRef.current?.close();
      setStatusMessage('숙박 완료 상태를 변경했습니다.');
      await loadMatrix();
    } catch (err) {
      setError(getApiErrorMessage(err) || '숙박 완료 상태를 변경하지 못했습니다.');
    } finally {
      setCellBusy(false);
    }
  };

  const handleReviewGuest = async (approve: boolean) => {
    if (!selectedCell) return;
    setCellBusy(true);
    try {
      await reviewGuestReservation(crewId, selectedCell.cell.reservationId, approve);
      cellDialogRef.current?.close();
      setStatusMessage(approve ? '게스트 예약을 승인했습니다.' : '게스트 예약을 반려했습니다.');
      await loadMatrix();
    } catch (err) {
      setError(getApiErrorMessage(err) || '게스트 승인 처리에 실패했습니다.');
    } finally {
      setCellBusy(false);
    }
  };

  const handleManagerOverrideCancel = async () => {
    if (!selectedCell) return;
    setCellBusy(true);
    try {
      await managerCancelOverride(crewId, selectedCell.cell.reservationId, overrideReason.trim() || undefined);
      cellDialogRef.current?.close();
      setStatusMessage('운영진 예외 취소를 완료했습니다 (감사 로그 기록).');
      await loadMatrix();
    } catch (err) {
      setError(getApiErrorMessage(err) || '예외 취소에 실패했습니다.');
    } finally {
      setCellBusy(false);
    }
  };

  const handleSavePassCharge = async () => {
    if (!selectedMember?.pass) return;
    setMemberBusy(true);
    try {
      await upsertStayCharge(crewId, {
        chargeKind: 'PASS_FEE',
        memberSeasonPassId: selectedMember.pass.passId,
        amountKrw: Math.max(0, Number(passAmount) || 0),
        paymentStatus: passPayStatus,
        depositorName: passDepositor.trim() || null,
      });
      setStatusMessage(`${selectedMember.name}님의 이용권/예약금 입금 상태를 저장했습니다.`);
      await loadMatrix();
    } catch (err) {
      setError(getApiErrorMessage(err) || '이용권 입금 저장에 실패했습니다.');
    } finally {
      setMemberBusy(false);
    }
  };

  const handleAddPrivateNote = async () => {
    if (!selectedMember || !newNoteContent.trim()) return;
    setMemberBusy(true);
    try {
      const created = await addMemberManagerNote(crewId, selectedMember.membershipId, {
        category: newNoteCategory,
        occurredOn: newNoteDate.trim() || null,
        penaltyDelta: Number(newNotePenalty) || 0,
        content: newNoteContent.trim(),
      });
      setMemberNotes((prev) => [created, ...prev]);
      setNewNoteContent('');
      setNewNotePenalty('0');
      setStatusMessage('운영진 비공개 메모를 기록했습니다.');
      await loadMatrix();
    } catch (err) {
      setError(getApiErrorMessage(err) || '비공개 메모를 저장하지 못했습니다.');
    } finally {
      setMemberBusy(false);
    }
  };

  const handleDeletePrivateNote = async (noteId: number) => {
    if (!selectedMember) return;
    setMemberBusy(true);
    try {
      await deleteMemberManagerNote(crewId, selectedMember.membershipId, noteId);
      setMemberNotes((prev) => prev.filter((n) => n.id !== noteId));
      await loadMatrix();
    } catch (err) {
      setError(getApiErrorMessage(err) || '메모 삭제에 실패했습니다.');
    } finally {
      setMemberBusy(false);
    }
  };

  const handleSavePolicy = async () => {
    setPolicyBusy(true);
    try {
      await updateSeasonHousePolicy(crewId, {
        alwaysOpen: policyAlwaysOpen,
        openDayOfWeek: policyAlwaysOpen ? null : policyOpenDay,
        openTimeKst: policyAlwaysOpen ? null : `${policyOpenTime}:00`,
        openOffsetDays: Math.max(0, Number(policyOffsetDays) || 0),
        bookingWindowDays: Math.max(0, Number(policyWindowDays) || 7),
        cancelCutoffDayOffset: Number(policyCutoffOffset) || 0,
        cancelCutoffTimeKst: `${policyCutoffTime}:00`,
        guestEnabled: policyGuestEnabled,
        guestApprovalMode: policyGuestMode,
        clearGuestDailyCapacity: policyGuestCap.trim() === '',
        guestDailyCapacity: policyGuestCap.trim() === '' ? null : Math.max(0, Number(policyGuestCap)),
        guestPerNightFeeKrw: Math.max(0, Number(policyGuestFee) || 0),
      });
      setPolicyOpen(false);
      policyDialogRef.current?.close();
      setStatusMessage('시즌방 운영 정책(오픈·마감·게스트)을 저장했습니다.');
      await loadMatrix();
    } catch (err) {
      setError(getApiErrorMessage(err) || '운영 정책을 저장하지 못했습니다.');
    } finally {
      setPolicyBusy(false);
    }
  };

  const handleExportCsv = () => {
    if (!matrix) return;
    const header = [
      '구분',
      '이름(가나다순)',
      '초대자',
      '이용권',
      '이용권입금',
      '벌점',
      ...weekStructure.daysWithWeek.map((d) => `${d.date}(${d.weekday})`),
    ];
    const memberCsvRows = filteredMembers.map((m) => [
      '크루원',
      m.name,
      '',
      m.pass ? `${m.pass.name}(${m.pass.remainingNights ?? '무제한'})` : '미등록',
      m.pass?.passCharge ? CHARGE_STATUS_LABELS[m.pass.passCharge.paymentStatus] : '',
      String(m.penaltyPoints),
      ...weekStructure.daysWithWeek.map((d) => {
        const c = m.cells[d.date];
        if (!c) return '';
        const mark = c.stayCompleted ? '완료' : c.status === 'CONFIRMED' ? 'O' : c.status === 'WAITING' ? '대기' : '승인대기';
        return c.usageCharge ? `${mark}(${CHARGE_STATUS_LABELS[c.usageCharge.paymentStatus]})` : mark;
      }),
    ]);
    const guestCsvRows = filteredGuests.map((g) => [
      '외부게스트',
      g.name,
      g.invitedByName,
      '1박정산',
      '',
      '',
      ...weekStructure.daysWithWeek.map((d) => {
        const c = g.cells[d.date];
        if (!c) return '';
        const mark = c.stayCompleted ? '완료' : c.status === 'CONFIRMED' ? 'O' : c.status === 'PENDING_APPROVAL' ? '승인대기' : '대기';
        return c.usageCharge ? `${mark}(${CHARGE_STATUS_LABELS[c.usageCharge.paymentStatus]})` : mark;
      }),
    ]);
    const csv = [header, ...memberCsvRows, ...guestCsvRows].map((row) => row.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `season_house_matrix_${from}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderCellBadge = (cell: MatrixCellView) => {
    if (cell.status === 'PENDING_APPROVAL') {
      return <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-amber-400 bg-amber-50 text-xs font-bold text-amber-700">승</span>;
    }
    if (cell.status === 'WAITING') {
      return <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-dashed border-amber-500 bg-amber-50 text-xs font-bold text-amber-700">대</span>;
    }
    if (cell.stayCompleted) {
      return <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[#162660] text-xs font-bold text-white">✓</span>;
    }
    return <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-blue-100 text-xs font-bold text-[#162660]">예</span>;
  };

  const renderUsageDot = (cell: MatrixCellView) => {
    if (!cell.usageCharge) return null;
    if (cell.usageCharge.paymentStatus === 'UNPAID') {
      return <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-rose-500 ring-1 ring-white" title="실제 이용금 미입금" />;
    }
    if (cell.usageCharge.paymentStatus === 'PAID') {
      return <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-emerald-500 ring-1 ring-white" title="실제 이용금 입금완료" />;
    }
    return null;
  };

  return (
    <div className="sh-matrix-wrap flex h-full flex-1 flex-col overflow-hidden bg-[#FAF8F3] text-zinc-900">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-white px-5 py-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 cursor-pointer"
            aria-label="뒤로 가기"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-black text-[#162660]">시즌방 이용 통계 매트릭스</h1>
              {matrix && (
                <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-xs font-semibold text-zinc-600">
                  {matrix.policy.openDayOfWeek && matrix.policy.openTimeKst
                    ? `매주 ${DAY_OF_WEEK_KO[matrix.policy.openDayOfWeek]} ${matrix.policy.openTimeKst.slice(0, 5)} 오픈`
                    : '상시 오픈'}
                  {' · '}취소마감 {matrix.policy.cancelCutoffTimeKst.slice(0, 5)}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500">
              좌상단 기준 · 가로: 일자(주차별 음영) · 세로: 가나다순 크루원 및 번호인증 외부 게스트
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openPolicyModal}
            disabled={!matrix}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 cursor-pointer disabled:opacity-50"
          >
            <Settings2 className="h-3.5 w-3.5" />
            오픈·취소·게스트 정책
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={!matrix}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#162660] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 cursor-pointer disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            표 내보내기
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
        {error && (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-700">
            {error}
          </div>
        )}
        {statusMessage && (
          <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-800">
            {statusMessage}
          </div>
        )}

        {/* KPI Strip */}
        <section aria-label="월간 이용 요약" className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3">
            <div className="text-xs text-zinc-500">월 확정 숙박 (게스트 포함)</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-lg font-black text-[#162660] tabular-nums">{kpis.totalNights}박</span>
              <span className="text-xs text-zinc-500">게스트 {kpis.guestNights}박</span>
            </div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3">
            <div className="text-xs text-zinc-500">미입금 건 (이용권+실제이용금)</div>
            <div className="mt-1 text-lg font-black text-rose-600 tabular-nums">{kpis.unpaidCharges}건</div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3">
            <div className="text-xs text-zinc-500">내부 연계 일정 (올시즌 이벤트)</div>
            <div className="mt-1 text-lg font-black text-zinc-900 tabular-nums">{matrix?.internalEvents.length ?? 0}건</div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3">
            <div className="text-xs text-zinc-500">비공개 메모 / 벌점 기록</div>
            <div className="mt-1 text-lg font-black text-zinc-900 tabular-nums">{kpis.noteMembers}명</div>
          </div>
        </section>

        {/* Controls Bar */}
        <section aria-label="매트릭스 필터" className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-zinc-200 bg-white p-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 px-1 py-0.5">
              <button type="button" onClick={() => shiftMonth(-1)} className="p-1 text-zinc-600 hover:text-zinc-900 cursor-pointer" aria-label="이전 달">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2 text-xs font-bold text-zinc-900 tabular-nums">{monthLabel}</span>
              <button type="button" onClick={() => shiftMonth(1)} className="p-1 text-zinc-600 hover:text-zinc-900 cursor-pointer" aria-label="다음 달">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-0.5 text-xs">
              {(['all', 'crew', 'guest', 'unpaid'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setScope(tab)}
                  className={`rounded-md px-2.5 py-1 font-semibold cursor-pointer ${
                    scope === tab ? 'bg-[#162660] text-white' : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  {tab === 'all' ? '전체' : tab === 'crew' ? '크루원' : tab === 'guest' ? '게스트' : '미입금'}
                </button>
              ))}
            </div>

            <label className="flex items-center gap-1.5 text-xs text-zinc-600">
              <span>주차 기준</span>
              <select
                value={weekStart}
                onChange={(e) => setWeekStart(Number(e.target.value) as 0 | 1)}
                className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-800"
              >
                <option value={1}>월~일 (주말 묶음)</option>
                <option value={0}>일~토 (달력 기준)</option>
              </select>
            </label>

            <label className="inline-flex items-center gap-1.5 text-xs text-zinc-700 cursor-pointer">
              <input
                type="checkbox"
                checked={showEvents}
                onChange={(e) => setShowEvents(e.target.checked)}
                className="accent-[#162660]"
              />
              <span>내부 일정 표시</span>
            </label>
          </div>

          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="이름 / 학번 / 초대자 검색"
            aria-label="크루원 또는 게스트 검색"
            className="w-48 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs text-zinc-900 placeholder:text-zinc-400"
          />
        </section>

        {/* Matrix Table */}
        {loading ? (
          <div className="rounded-xl border border-zinc-200 bg-white py-16 text-center text-xs text-zinc-500">
            시즌방 매트릭스를 불러오는 중입니다...
          </div>
        ) : matrix ? (
          <div
            ref={scrollerRef}
            tabIndex={0}
            role="region"
            aria-labelledby="season-house-matrix-caption"
            className="sh-matrix-scroller"
          >
            <table className="sh-matrix-table">
              <caption id="season-house-matrix-caption" className="sr-only">
                시즌방 일별 크루원 및 게스트 이용 통계 테이블 (좌상단 기준, 가나다순, 주차별 음영 구분)
              </caption>
              <thead>
                {/* Row 0: Week intervals with alternating shading */}
                <tr>
                  <th rowSpan={2} scope="col" className="sh-sticky-name sh-origin-cell px-2.5 py-1.5 text-xs font-bold">
                    <div className="flex h-11 flex-col justify-between leading-tight">
                      <span className="self-end text-zinc-500">일자 →</span>
                      <span className="self-start text-zinc-900">크루원(가나다) ↓</span>
                    </div>
                  </th>
                  <th rowSpan={2} scope="col" className="sh-sticky-pass px-1.5 text-xs font-bold text-zinc-800">
                    이용권
                    <div className="text-xs font-normal text-zinc-500">잔여 · 입금</div>
                  </th>
                  {weekStructure.weeks.map((week) => (
                    <th
                      key={week.weekIdx}
                      colSpan={week.days.length}
                      scope="colgroup"
                      className={`sh-week-start px-2 py-1.5 text-xs font-bold text-zinc-800 ${
                        week.weekIdx % 2 === 1 ? 'sh-week-head-even' : 'sh-week-head-odd'
                      }`}
                    >
                      {week.label}
                    </th>
                  ))}
                </tr>

                {/* Row 1: Days + Weekday + Cutoff lock */}
                <tr>
                  {weekStructure.daysWithWeek.map((d) => (
                    <th
                      key={d.date}
                      scope="col"
                      data-day-col={d.date}
                      className={`sh-day-col py-1 ${d.isWeekStart ? 'sh-week-start' : ''} ${
                        d.weekIdx % 2 === 1 ? 'sh-week-head-even' : 'sh-week-head-odd'
                      }`}
                      title={`${d.date} (${d.weekday})${d.pastCutoff ? ' · 취소 마감 경과' : ''}`}
                    >
                      <div className="text-xs font-bold text-zinc-900">{d.dayNum}</div>
                      <div
                        className={`text-xs font-semibold ${
                          d.dow === 6 ? 'text-blue-600' : d.dow === 0 ? 'text-rose-600' : 'text-zinc-500'
                        }`}
                      >
                        {d.weekday}
                      </div>
                    </th>
                  ))}
                </tr>

                {/* Row 2 (1.4): Unified All-Season Internal Events Banner */}
                {showEvents && matrix.internalEvents.length > 0 && (
                  <tr>
                    <th colSpan={2} scope="row" className="sh-sticky-span px-3 py-1.5 text-left text-xs font-semibold text-zinc-600">
                      내부 일정 ({matrix.internalEvents.length})
                    </th>
                    {weekStructure.daysWithWeek.map((d) => {
                      const matched = matrix.internalEvents.find(
                        (ev) => ev.startsAt.slice(0, 10) <= d.date && ev.endsAt.slice(0, 10) >= d.date,
                      );
                      return (
                        <td
                          key={d.date}
                          className={`sh-day-col py-1 ${d.isWeekStart ? 'sh-week-start' : ''} ${
                            d.weekIdx % 2 === 1 ? 'sh-week-head-even' : 'sh-week-head-odd'
                          }`}
                          title={matched ? matched.title : undefined}
                        >
                          {matched && (
                            <span className="inline-block max-w-[2.4rem] truncate rounded bg-indigo-100 px-1 py-0.5 text-xs font-bold text-indigo-800">
                              {matched.title}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                )}
              </thead>

              <tbody>
                {filteredMembers.map((member) => {
                  const passText = !member.pass
                    ? '미등록'
                    : member.pass.totalNights == null
                    ? '무제한'
                    : `잔여 ${member.pass.remainingNights ?? 0}/${member.pass.totalNights}`;
                  const passChargeStatus = member.pass?.passCharge?.paymentStatus;
                  return (
                    <tr key={member.membershipId} className="sh-row">
                      <th scope="row" className="sh-sticky-name px-2.5 py-1.5 text-left">
                        <button
                          type="button"
                          onClick={() => void openMemberModal(member)}
                          className="flex w-full items-center justify-between gap-1 text-left hover:opacity-80 cursor-pointer"
                          title="클릭하여 이용권 입금 및 운영진 비공개 메모 관리"
                        >
                          <span className="truncate text-xs font-bold text-zinc-900">
                            {member.name}
                            {member.studentNumber && (
                              <span className="ml-1 font-normal text-zinc-500">{member.studentNumber.slice(0, 2)}</span>
                            )}
                          </span>
                          <span className="flex shrink-0 items-center gap-1">
                            {member.penaltyPoints !== 0 && (
                              <span className="rounded bg-rose-100 px-1 text-xs font-bold text-rose-700">
                                벌{member.penaltyPoints}
                              </span>
                            )}
                            {member.noteCount > 0 && (
                              <Lock className="h-3 w-3 text-zinc-400" aria-label="비공개 메모 있음" />
                            )}
                          </span>
                        </button>
                      </th>
                      <td className="sh-sticky-pass px-1.5 py-1 text-xs">
                        <div className="font-semibold text-zinc-800">{passText}</div>
                        {passChargeStatus && (
                          <div
                            className={`text-xs font-semibold ${
                              passChargeStatus === 'UNPAID'
                                ? 'text-rose-600'
                                : passChargeStatus === 'PAID'
                                ? 'text-emerald-700'
                                : 'text-zinc-500'
                            }`}
                          >
                            {CHARGE_STATUS_LABELS[passChargeStatus]}
                          </div>
                        )}
                      </td>
                      {weekStructure.daysWithWeek.map((d) => {
                        const cell = member.cells[d.date];
                        return (
                          <td
                            key={d.date}
                            className={`sh-day-col ${d.isWeekStart ? 'sh-week-start' : ''} ${
                              d.weekIdx % 2 === 1 ? 'sh-week-even' : 'sh-week-odd'
                            } ${d.pastCutoff ? 'sh-past-col' : ''}`}
                          >
                            {cell ? (
                              <button
                                type="button"
                                onClick={() => openCellModal('MEMBER', member.name, d, cell)}
                                className="relative flex h-10 w-full items-center justify-center cursor-pointer"
                                aria-label={`${member.name} ${d.date} ${RESERVATION_STATUS_LABELS[cell.status]}`}
                              >
                                {renderCellBadge(cell)}
                                {renderUsageDot(cell)}
                              </button>
                            ) : (
                              <div className="flex h-10 w-full items-center justify-center">
                                <span className="h-1 w-1 rounded-full bg-zinc-300" aria-hidden="true" />
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}

                {/* Unified External Guests Section (1.5) */}
                {filteredGuests.length > 0 && (
                  <>
                    <tr>
                      <td colSpan={2} className="sh-sticky-span px-2.5 py-1.5 text-left text-xs font-bold text-zinc-700">
                        외부 게스트 ({filteredGuests.length}명 · 번호인증✓)
                      </td>
                      <td colSpan={weekStructure.daysWithWeek.length} className="bg-slate-100 px-3 py-1.5 text-left text-xs text-zinc-600">
                        게스트 정책: {GUEST_APPROVAL_MODE_LABELS[matrix.policy.guestApprovalMode]}
                        {matrix.policy.guestDailyCapacity != null ? ` · 1일 최대 ${matrix.policy.guestDailyCapacity}명` : ''}
                      </td>
                    </tr>
                    {filteredGuests.map((guest: GuestMatrixRow) => (
                      <tr key={guest.guestId} className="sh-row">
                        <th scope="row" className="sh-sticky-name px-2.5 py-1.5 text-left">
                          <div className="text-xs font-bold text-zinc-900">
                            {guest.name}
                            <span className="ml-1 rounded bg-slate-100 px-1 text-xs font-semibold text-slate-600">게스트</span>
                          </div>
                          <div className="truncate text-xs font-normal text-zinc-500">
                            초대: {guest.invitedByName} · {guest.maskedPhone}
                          </div>
                        </th>
                        <td className="sh-sticky-pass px-1.5 py-1 text-xs text-zinc-500">1박 정산</td>
                        {weekStructure.daysWithWeek.map((d) => {
                          const cell = guest.cells[d.date];
                          return (
                            <td
                              key={d.date}
                              className={`sh-day-col ${d.isWeekStart ? 'sh-week-start' : ''} ${
                                d.weekIdx % 2 === 1 ? 'sh-week-even' : 'sh-week-odd'
                              } ${d.pastCutoff ? 'sh-past-col' : ''}`}
                            >
                              {cell ? (
                                <button
                                  type="button"
                                  onClick={() => openCellModal('GUEST', `${guest.name} (게스트)`, d, cell)}
                                  className="relative flex h-10 w-full items-center justify-center cursor-pointer"
                                  aria-label={`${guest.name} ${d.date} ${RESERVATION_STATUS_LABELS[cell.status]}`}
                                >
                                  {renderCellBadge(cell)}
                                  {renderUsageDot(cell)}
                                </button>
                              ) : (
                                <div className="flex h-10 w-full items-center justify-center">
                                  <span className="h-1 w-1 rounded-full bg-zinc-300" aria-hidden="true" />
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </>
                )}
              </tbody>

              <tfoot>
                <tr>
                  <th scope="row" className="sh-sticky-name px-2.5 py-2 text-left text-xs font-bold text-zinc-900">
                    일별 확정 인원
                  </th>
                  <td className="sh-sticky-pass px-1.5 py-2 text-xs font-bold text-[#162660]">
                    정원 {matrix.policy.dailyCapacity}
                  </td>
                  {weekStructure.daysWithWeek.map((d) => {
                    const isFull = matrix.policy.capacityLimited && d.confirmedCount >= matrix.policy.dailyCapacity;
                    return (
                      <td
                        key={d.date}
                        className={`sh-day-col py-1.5 text-xs font-bold ${d.isWeekStart ? 'sh-week-start' : ''} ${
                          d.weekIdx % 2 === 1 ? 'sh-week-head-even' : 'sh-week-head-odd'
                        } ${isFull ? 'text-rose-600' : 'text-zinc-800'}`}
                      >
                        {d.confirmedCount}
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          </div>
        ) : null}
      </main>

      {/* Cell Management Dialog (1.2 cutoff lock + 1.3 actual usage fee + 1.5 guest approval) */}
      <dialog
        ref={cellDialogRef}
        {...({ closedby: 'any' } as Record<string, string>)}
        aria-labelledby="sh-cell-dialog-title"
        className="sh-dialog"
      >
        {selectedCell && (
          <div className="p-5 space-y-4 text-xs">
            <div className="flex items-start justify-between border-b border-zinc-200 pb-3">
              <div>
                <h2 id="sh-cell-dialog-title" className="text-base font-bold text-[#162660]">
                  {selectedCell.name} · {selectedCell.date}
                </h2>
                <p className="mt-0.5 text-zinc-500">
                  상태: {RESERVATION_STATUS_LABELS[selectedCell.cell.status]}
                  {selectedCell.cell.stayCompleted ? ' · 숙박 완료' : ''}
                </p>
              </div>
              <button type="button" onClick={() => cellDialogRef.current?.close()} className="px-2 py-1 text-zinc-500 cursor-pointer" aria-label="닫기">
                ✕
              </button>
            </div>

            {selectedCell.day.pastCutoff && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900">
                <div className="font-bold">🔒 취소 마감 경과 (어뷰징 방지)</div>
                <p className="mt-1">마감 시각({selectedCell.day.cancelCutoffAtKst.replace('T', ' ').slice(0, 16)}) 이후 일반 취소는 차단됩니다.</p>
              </div>
            )}

            {selectedCell.cell.status === 'PENDING_APPROVAL' && (
              <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-3">
                <span className="font-semibold text-amber-900">게스트 승인 대기 중</span>
                <div className="flex gap-2">
                  <button type="button" disabled={cellBusy} onClick={() => void handleReviewGuest(false)} className="rounded-lg border border-rose-300 bg-white px-3 py-1 font-semibold text-rose-700 cursor-pointer">
                    반려
                  </button>
                  <button type="button" disabled={cellBusy} onClick={() => void handleReviewGuest(true)} className="rounded-lg bg-[#162660] px-3 py-1 font-semibold text-white cursor-pointer">
                    승인
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2.5 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
              <div className="font-bold text-zinc-900">실제 이용금 정산 (별도 입금)</div>
              <div className="grid grid-cols-2 gap-2.5">
                <label className="block space-y-1">
                  <span className="text-zinc-600">금액 (원)</span>
                  <input type="number" min={0} value={cellAmount} onChange={(e) => setCellAmount(e.target.value)} className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5" />
                </label>
                <label className="block space-y-1">
                  <span className="text-zinc-600">입금 상태</span>
                  <select value={cellPayStatus} onChange={(e) => setCellPayStatus(e.target.value as StayChargeStatus)} className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5">
                    {(['UNPAID', 'PAID', 'WAIVED', 'REFUNDED'] as const).map((st) => (
                      <option key={st} value={st}>{CHARGE_STATUS_LABELS[st]}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <label className="block space-y-1">
                  <span className="text-zinc-600">입금자명</span>
                  <input type="text" value={cellDepositor} onChange={(e) => setCellDepositor(e.target.value)} placeholder="이체자명" className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5" />
                </label>
                <label className="block space-y-1">
                  <span className="text-zinc-600">정산 메모</span>
                  <input type="text" value={cellNote} onChange={(e) => setCellNote(e.target.value)} placeholder="특이사항" className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5" />
                </label>
              </div>
              <button type="button" disabled={cellBusy} onClick={() => void handleSaveCellCharge()} className="w-full rounded-lg bg-[#162660] py-2 font-semibold text-white cursor-pointer">
                실제 이용금 저장
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200 pt-3">
              {selectedCell.cell.status === 'CONFIRMED' && (
                <button type="button" disabled={cellBusy} onClick={() => void handleToggleCompleted()} className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 font-semibold text-zinc-800 cursor-pointer">
                  {selectedCell.cell.stayCompleted ? '숙박 완료 해제' : '숙박 완료 처리'}
                </button>
              )}
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="예외 취소 사유"
                  className="w-32 rounded-lg border border-zinc-300 px-2 py-1"
                />
                <button type="button" disabled={cellBusy} onClick={() => void handleManagerOverrideCancel()} className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 font-semibold text-rose-700 cursor-pointer">
                  운영진 예외 취소
                </button>
              </div>
            </div>
          </div>
        )}
      </dialog>

      {/* Member Pass Charge & Private Manager Notes Dialog (1.3 + 1.6) */}
      <dialog
        ref={memberDialogRef}
        {...({ closedby: 'any' } as Record<string, string>)}
        aria-labelledby="sh-member-dialog-title"
        className="sh-dialog"
      >
        {selectedMember && (
          <div className="p-5 space-y-4 text-xs">
            <div className="flex items-start justify-between border-b border-zinc-200 pb-3">
              <div>
                <h2 id="sh-member-dialog-title" className="text-base font-bold text-[#162660]">
                  {selectedMember.name}
                </h2>
                <p className="mt-0.5 text-zinc-500">
                  누적 벌점: <strong className="text-rose-600">{selectedMember.penaltyPoints}점</strong> · 운영진 전용 관리
                </p>
              </div>
              <button type="button" onClick={() => memberDialogRef.current?.close()} className="px-2 py-1 text-zinc-500 cursor-pointer" aria-label="닫기">
                ✕
              </button>
            </div>

            {selectedMember.pass && (
              <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <div className="font-bold text-zinc-900">
                  이용권 / 예약금 입금 ({selectedMember.pass.name})
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input type="number" min={0} value={passAmount} onChange={(e) => setPassAmount(e.target.value)} aria-label="이용권 금액" className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5" />
                  <select value={passPayStatus} onChange={(e) => setPassPayStatus(e.target.value as StayChargeStatus)} aria-label="이용권 입금 상태" className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5">
                    {(['UNPAID', 'PAID', 'WAIVED', 'REFUNDED'] as const).map((st) => (
                      <option key={st} value={st}>{CHARGE_STATUS_LABELS[st]}</option>
                    ))}
                  </select>
                  <input type="text" value={passDepositor} onChange={(e) => setPassDepositor(e.target.value)} placeholder="입금자명" className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5" />
                </div>
                <button type="button" disabled={memberBusy} onClick={() => void handleSavePassCharge()} className="w-full rounded-lg bg-[#162660] py-1.5 font-semibold text-white cursor-pointer">
                  이용권 입금 저장
                </button>
              </div>
            )}

            {/* 1.6 Private Manager Notes */}
            <div className="space-y-2.5 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-zinc-900">🔒 운영진 비공개 메모 & 벌점</span>
                <span className="text-zinc-500">크루원 본인 열람 불가</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <select value={newNoteCategory} onChange={(e) => setNewNoteCategory(e.target.value as ManagerNoteCategory)} aria-label="메모 분류" className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5">
                  {(['GENERAL', 'PENALTY', 'CLEANING', 'FACILITY'] as const).map((cat) => (
                    <option key={cat} value={cat}>{NOTE_CATEGORY_LABELS[cat]}</option>
                  ))}
                </select>
                <input
                  type="date"
                  value={newNoteDate}
                  onChange={(e) => setNewNoteDate(e.target.value)}
                  aria-label="메모 날짜"
                  className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 tabular-nums"
                />
                <input type="number" min={-10} max={10} value={newNotePenalty} onChange={(e) => setNewNotePenalty(e.target.value)} aria-label="벌점 증감" placeholder="벌점 (+/-)" className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5" />
                <button type="button" disabled={memberBusy || !newNoteContent.trim()} onClick={() => void handleAddPrivateNote()} className="rounded-lg bg-[#162660] font-semibold text-white cursor-pointer disabled:opacity-50">
                  메모 추가
                </button>
              </div>
              <textarea
                rows={2}
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                placeholder="벌점 사유, 청소 당번 기록 등 (본인에게 표시되지 않음)"
                className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5"
              />

              <div className="max-h-40 space-y-1.5 overflow-y-auto pt-1">
                {notesLoading ? (
                  <p className="text-zinc-500">메모를 불러오는 중...</p>
                ) : memberNotes.length === 0 ? (
                  <p className="text-zinc-400">기록된 비공개 메모가 없습니다.</p>
                ) : (
                  memberNotes.map((note) => (
                    <div key={note.id} className="flex items-start justify-between gap-2 rounded-lg border border-zinc-200 bg-white p-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-semibold text-zinc-700">
                            {NOTE_CATEGORY_LABELS[note.category]}
                          </span>
                          {(note.occurredOn || note.createdAt) && (
                            <span className="rounded bg-blue-50 px-1.5 py-0.5 font-semibold tabular-nums text-[#162660]">
                              {note.occurredOn ?? note.createdAt?.slice(0, 10)}
                            </span>
                          )}
                          {note.penaltyDelta !== 0 && (
                            <span className="font-bold text-rose-600">
                              {note.penaltyDelta > 0 ? `+${note.penaltyDelta}` : note.penaltyDelta}점
                            </span>
                          )}
                          <span className="text-zinc-400">{note.authorName}</span>
                        </div>
                        <p className="mt-1 text-zinc-800">{note.content}</p>
                      </div>
                      <button type="button" onClick={() => void handleDeletePrivateNote(note.id)} className="shrink-0 text-zinc-400 hover:text-rose-600 cursor-pointer" aria-label="메모 삭제">
                        삭제
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </dialog>

      {/* Policy Settings Dialog (1.1 + 1.2 + 1.5) */}
      <dialog
        ref={policyDialogRef}
        {...({ closedby: 'any' } as Record<string, string>)}
        aria-labelledby="sh-policy-dialog-title"
        className="sh-dialog"
      >
        {policyOpen && (
          <div className="p-5 space-y-4 text-xs">
            <div className="flex items-start justify-between border-b border-zinc-200 pb-3">
              <h2 id="sh-policy-dialog-title" className="text-base font-bold text-[#162660]">
                시즌방 운영 정책 (오픈 · 마감 · 게스트)
              </h2>
              <button type="button" onClick={() => { setPolicyOpen(false); policyDialogRef.current?.close(); }} className="px-2 py-1 text-zinc-500 cursor-pointer" aria-label="닫기">
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <div className="font-bold text-zinc-900">매주 자동 신청 오픈</div>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={policyAlwaysOpen} onChange={(e) => setPolicyAlwaysOpen(e.target.checked)} className="accent-[#162660]" />
                <span>상시 오픈 (매주 특정 오픈 시각 미사용)</span>
              </label>
              {!policyAlwaysOpen && (
                <div className="grid grid-cols-2 gap-2">
                  <select value={policyOpenDay} onChange={(e) => setPolicyOpenDay(e.target.value as DayOfWeek)} aria-label="오픈 요일" className="rounded-lg border border-zinc-300 px-2 py-1.5">
                    {(Object.keys(DAY_OF_WEEK_KO) as DayOfWeek[]).map((day) => (
                      <option key={day} value={day}>매주 {DAY_OF_WEEK_KO[day]}요일</option>
                    ))}
                  </select>
                  <input type="time" value={policyOpenTime} onChange={(e) => setPolicyOpenTime(e.target.value)} aria-label="오픈 시각" className="rounded-lg border border-zinc-300 px-2 py-1.5" />
                  <label className="block space-y-1">
                    <span className="text-zinc-500">사전 오픈 일수</span>
                    <input type="number" min={0} value={policyOffsetDays} onChange={(e) => setPolicyOffsetDays(e.target.value)} className="w-full rounded-lg border border-zinc-300 px-2 py-1.5" />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-zinc-500">예약 가능 기간(일)</span>
                    <input type="number" min={0} max={366} value={policyWindowDays} onChange={(e) => setPolicyWindowDays(e.target.value)} className="w-full rounded-lg border border-zinc-300 px-2 py-1.5" />
                  </label>
                </div>
              )}
            </div>

            <div className="space-y-2 border-t border-zinc-200 pt-3">
              <div className="font-bold text-zinc-900">취소 불가 마감 시간 (기본: 당일 04:00)</div>
              <div className="grid grid-cols-2 gap-2">
                <label className="block space-y-1">
                  <span className="text-zinc-500">기준일 오프셋 (0=당일, -1=전날)</span>
                  <input type="number" min={-7} max={1} value={policyCutoffOffset} onChange={(e) => setPolicyCutoffOffset(e.target.value)} className="w-full rounded-lg border border-zinc-300 px-2 py-1.5" />
                </label>
                <label className="block space-y-1">
                  <span className="text-zinc-500">마감 시각</span>
                  <input type="time" value={policyCutoffTime} onChange={(e) => setPolicyCutoffTime(e.target.value)} className="w-full rounded-lg border border-zinc-300 px-2 py-1.5" />
                </label>
              </div>
            </div>

            <div className="space-y-2 border-t border-zinc-200 pt-3">
              <div className="font-bold text-zinc-900">외부 게스트 정책 (휴대폰 본인인증 필수)</div>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={policyGuestEnabled} onChange={(e) => setPolicyGuestEnabled(e.target.checked)} className="accent-[#162660]" />
                <span>외부 게스트 시즌방 이용 허용</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <label className="col-span-2 block space-y-1">
                  <span className="text-zinc-500">승인 방식</span>
                  <select value={policyGuestMode} onChange={(e) => setPolicyGuestMode(e.target.value as GuestApprovalMode)} className="w-full rounded-lg border border-zinc-300 px-2 py-1.5">
                    <option value="INVITE_REQUIRED">크루원 초대 필수</option>
                    <option value="INVITE_WITH_MANAGER_APPROVAL">초대 + 운영진 승인</option>
                    <option value="OPEN_LINK">인증 링크 자유 신청</option>
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className="text-zinc-500">일일 게스트 상한</span>
                  <input type="number" min={0} placeholder="무제한" value={policyGuestCap} onChange={(e) => setPolicyGuestCap(e.target.value)} className="w-full rounded-lg border border-zinc-300 px-2 py-1.5" />
                </label>
              </div>
              <label className="block space-y-1">
                <span className="text-zinc-500">게스트 기본 1박 이용금 (원)</span>
                <input type="number" min={0} value={policyGuestFee} onChange={(e) => setPolicyGuestFee(e.target.value)} className="w-full rounded-lg border border-zinc-300 px-2 py-1.5" />
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t border-zinc-200 pt-3">
              <button type="button" onClick={() => { setPolicyOpen(false); policyDialogRef.current?.close(); }} className="rounded-lg border border-zinc-300 px-3 py-1.5 cursor-pointer">
                취소
              </button>
              <button type="button" disabled={policyBusy} onClick={() => void handleSavePolicy()} className="rounded-lg bg-[#162660] px-4 py-1.5 font-semibold text-white cursor-pointer">
                정책 저장
              </button>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}
