import { useEffect, useState } from "react";
import { buildRoundItem, buildSessionSummary } from "../adapters";
import { deleteSessionTurn, fetchSessionTurns, mergeSessionTurns } from "../api";
import { rounds as mockRounds, sessionSummary as mockSessionSummary } from "../mockData";
import { useDashboard } from "../providers/DashboardProvider";
import { roundLabel, sourceRoundLabel } from "../workspace-utils";
import type { RoundItem, SessionSummary, TurnsResponse } from "../types";

export type MergeModalState = {
  rounds: [RoundItem, RoundItem];
  mergedInterviewerText: string;
  mergedCandidateText: string;
};

const defaultSessionSummary: SessionSummary = {
  sessionKey: "",
  title: "面试复盘",
  model: "deepseek-chat",
  totalRounds: 0,
  createdDate: "--",
  roleFocus: "面试复盘",
};

function appendText(currentText: string, nextText: string) {
  const normalized = nextText.trim();

  if (!normalized) {
    return currentText;
  }

  return currentText ? `${currentText}\n\n${normalized}` : normalized;
}

export function useWorkspaceSession(requestedSessionKey?: string) {
  const { sessionCatalog, refreshSessionCatalog, dashboardSessions, homeLeadSession } = useDashboard();

  const [sessionSummary, setSessionSummary] = useState<SessionSummary>(defaultSessionSummary);
  const [rounds, setRounds] = useState<RoundItem[]>([]);
  const [activeRoundNumber, setActiveRoundNumber] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workspaceNotice, setWorkspaceNotice] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [selectedRoundNumbers, setSelectedRoundNumbers] = useState<number[]>([]);
  const [mutationBusy, setMutationBusy] = useState(false);
  const [mergeModal, setMergeModal] = useState<MergeModalState | null>(null);
  const [isMockWorkspace, setIsMockWorkspace] = useState(false);

  const currentSessionCard =
    dashboardSessions.find((item) => item.sessionKey === sessionSummary.sessionKey) ||
    dashboardSessions.find((item) => item.sessionKey === requestedSessionKey) ||
    homeLeadSession;
  const activeRound =
    rounds.find((item) => item.roundNumber === activeRoundNumber) || rounds[0] || null;
  const reviewFlagCount = rounds.filter((item) => item.needsReview).length;
  const highValueCount = rounds.filter((item) => item.review.score >= 80).length;
  const selectedRounds = rounds
    .filter((round) => selectedRoundNumbers.includes(round.roundNumber))
    .sort((left, right) => left.roundNumber - right.roundNumber);
  const canMerge =
    selectedRounds.length === 2 &&
    selectedRounds[1].roundNumber === selectedRounds[0].roundNumber + 1 &&
    !isMockWorkspace;
  const canDelete = selectedRounds.length === 1 && !isMockWorkspace;

  function applyTurnsResponse(turnsResponse: TurnsResponse, preferredRoundNumber?: number | null) {
    const nextRounds = turnsResponse.items.map(buildRoundItem);

    if (!nextRounds.length) {
      throw new Error("当前会话没有轮次数据，暂时无法展示目录。");
    }

    setSessionSummary(buildSessionSummary(turnsResponse.session));
    setRounds(nextRounds);
    setActiveRoundNumber((current) => {
      const candidateRoundNumber = preferredRoundNumber ?? current;
      return candidateRoundNumber && nextRounds.some((item) => item.roundNumber === candidateRoundNumber)
        ? candidateRoundNumber
        : nextRounds[0].roundNumber;
    });
  }

  function applyMockSessionData(preferredRoundNumber?: number | null, sessionKey?: string) {
    const matchedCard =
      dashboardSessions.find((item) => item.sessionKey === sessionKey) ||
      currentSessionCard ||
      homeLeadSession;

    setSessionSummary({
      sessionKey: matchedCard?.sessionKey || mockSessionSummary.sessionKey,
      title: matchedCard?.title || mockSessionSummary.title,
      model: matchedCard?.model || mockSessionSummary.model,
      totalRounds: matchedCard?.totalRounds || mockSessionSummary.totalRounds,
      createdDate: matchedCard?.updatedDate || mockSessionSummary.createdDate,
      roleFocus: matchedCard?.roleFocus || mockSessionSummary.roleFocus,
    });
    setRounds(mockRounds);
    setActiveRoundNumber((current) => {
      const candidateRoundNumber = preferredRoundNumber ?? current;
      return candidateRoundNumber && mockRounds.some((item) => item.roundNumber === candidateRoundNumber)
        ? candidateRoundNumber
        : mockRounds[0]?.roundNumber || null;
    });
  }

  async function loadSessionData({
    targetSessionKey,
    preferredRoundNumber,
    showLoading = true,
  }: {
    targetSessionKey?: string;
    preferredRoundNumber?: number | null;
    showLoading?: boolean;
  } = {}) {
    if (showLoading) {
      setLoading(true);
    }

    setError(null);
    setWorkspaceNotice(null);

    try {
      let resolvedSessionKey = targetSessionKey;
      let availableItems = sessionCatalog;

      if (!availableItems.length && !resolvedSessionKey) {
        availableItems = await refreshSessionCatalog();
      }

      if (!resolvedSessionKey) {
        const firstSession = availableItems[0];
        resolvedSessionKey = firstSession?.sessionKey;
      }

      if (!resolvedSessionKey) {
        applyMockSessionData(preferredRoundNumber, mockSessionSummary.sessionKey);
        setIsMockWorkspace(true);
        setWorkspaceNotice("数据库里还没有真实会话，当前先展示静态样例工作台。");
        return;
      }

      const turnsResponse = await fetchSessionTurns(resolvedSessionKey);
      applyTurnsResponse(turnsResponse, preferredRoundNumber);
      setIsMockWorkspace(false);
    } catch (loadError) {
      applyMockSessionData(preferredRoundNumber, targetSessionKey);
      setIsMockWorkspace(true);
      setWorkspaceNotice(
        `当前先展示静态样例工作台，等我们接数据库后就会切回真实数据。底层原因：${
          loadError instanceof Error ? loadError.message : "未知错误"
        }`
      );
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    setEditMode(false);
    setSelectedRoundNumbers([]);
    setMergeModal(null);
    setMutationBusy(false);
    void loadSessionData({
      targetSessionKey: requestedSessionKey,
    });
  }, [requestedSessionKey]);

  function toggleEditMode() {
    if (isMockWorkspace) {
      return;
    }

    setEditMode((current) => !current);
    setSelectedRoundNumbers([]);
    setMergeModal(null);
  }

  function toggleRoundSelection(roundNumber: number) {
    setSelectedRoundNumbers((current) =>
      current.includes(roundNumber)
        ? current.filter((value) => value !== roundNumber)
        : [...current, roundNumber].sort((left, right) => left - right)
    );
  }

  function handleRoundCardClick(roundNumber: number) {
    setActiveRoundNumber(roundNumber);

    if (editMode) {
      toggleRoundSelection(roundNumber);
    }
  }

  function openMergeModal() {
    if (!canMerge) {
      return;
    }

    setMergeModal({
      rounds: [selectedRounds[0], selectedRounds[1]],
      mergedInterviewerText: "",
      mergedCandidateText: "",
    });
  }

  function closeMergeModal() {
    if (mutationBusy) {
      return;
    }

    setMergeModal(null);
  }

  function appendMergeFragment(target: "interviewer" | "candidate", fragmentText: string) {
    if (!mergeModal) {
      return;
    }

    if (target === "interviewer") {
      setMergeModal({
        ...mergeModal,
        mergedInterviewerText: appendText(mergeModal.mergedInterviewerText, fragmentText),
      });
      return;
    }

    setMergeModal({
      ...mergeModal,
      mergedCandidateText: appendText(mergeModal.mergedCandidateText, fragmentText),
    });
  }

  function updateMergedInterviewerText(mergedInterviewerText: string) {
    if (!mergeModal) {
      return;
    }

    setMergeModal({
      ...mergeModal,
      mergedInterviewerText,
    });
  }

  function updateMergedCandidateText(mergedCandidateText: string) {
    if (!mergeModal) {
      return;
    }

    setMergeModal({
      ...mergeModal,
      mergedCandidateText,
    });
  }

  function clearMergedText() {
    if (!mergeModal) {
      return;
    }

    setMergeModal({
      ...mergeModal,
      mergedInterviewerText: "",
      mergedCandidateText: "",
    });
  }

  async function handleConfirmMerge() {
    if (!mergeModal || !sessionSummary.sessionKey || isMockWorkspace) {
      return;
    }

    setMutationBusy(true);

    try {
      await mergeSessionTurns(sessionSummary.sessionKey, {
        roundNumbers: mergeModal.rounds.map((round) => round.roundNumber),
        mergedInterviewerText: mergeModal.mergedInterviewerText,
        mergedCandidateText: mergeModal.mergedCandidateText,
      });

      const preferredRoundNumber = mergeModal.rounds[0].roundNumber;
      setMergeModal(null);
      setSelectedRoundNumbers([]);
      await loadSessionData({
        targetSessionKey: sessionSummary.sessionKey,
        preferredRoundNumber,
        showLoading: false,
      });
    } catch (mutationError) {
      window.alert(mutationError instanceof Error ? mutationError.message : "合并失败");
    } finally {
      setMutationBusy(false);
    }
  }

  async function handleDeleteRound() {
    if (!canDelete || !sessionSummary.sessionKey || isMockWorkspace) {
      return;
    }

    const targetRound = selectedRounds[0];
    const confirmed = window.confirm(
      `确定删除 ${roundLabel(targetRound)} 吗？\n\n${sourceRoundLabel(targetRound)}`
    );

    if (!confirmed) {
      return;
    }

    setMutationBusy(true);

    try {
      await deleteSessionTurn(sessionSummary.sessionKey, {
        roundNumber: targetRound.roundNumber,
      });

      setSelectedRoundNumbers([]);
      await loadSessionData({
        targetSessionKey: sessionSummary.sessionKey,
        showLoading: false,
      });
    } catch (mutationError) {
      window.alert(mutationError instanceof Error ? mutationError.message : "删除失败");
    } finally {
      setMutationBusy(false);
    }
  }

  return {
    sessionSummary,
    rounds,
    activeRound,
    loading,
    error,
    workspaceNotice,
    editMode,
    selectedRoundNumbers,
    mutationBusy,
    mergeModal,
    isMockWorkspace,
    currentSessionCard,
    reviewFlagCount,
    highValueCount,
    selectedRounds,
    canMerge,
    canDelete,
    toggleEditMode,
    handleRoundCardClick,
    openMergeModal,
    closeMergeModal,
    appendMergeFragment,
    updateMergedInterviewerText,
    updateMergedCandidateText,
    clearMergedText,
    handleConfirmMerge,
    handleDeleteRound,
  };
}
