"use client";

import { useState } from "react";
import { History, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getBoardSnapshots, restoreBoardSnapshot, type BoardSnapshot } from "@/lib/api";

type SnapshotDialogProps = {
  boardId: string;
};

function formatTimeAgo(dateString: string) {
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function SnapshotDialog({ boardId }: SnapshotDialogProps) {
  const [open, setOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: snapshots = [], isLoading } = useQuery({
    queryKey: ["board-snapshots", boardId],
    queryFn: () => getBoardSnapshots(boardId),
    enabled: open,
    staleTime: 10_000,
  });

  const restoreMutation = useMutation({
    mutationFn: (snapshotId: string) => restoreBoardSnapshot(boardId, snapshotId),
    onSuccess: () => {
      setConfirmId(null);
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["board-snapshots", boardId] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to restore snapshot");
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="icon-sm" title="Snapshots">
          <History className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Snapshots</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading snapshots...</p>
        ) : snapshots.length === 0 ? (
          <p className="text-sm text-slate-500">No snapshots yet.</p>
        ) : (
          <div className="max-h-72 space-y-2 overflow-auto">
            {snapshots.map((snap: BoardSnapshot) => {
              const isConfirming = confirmId === snap.id;
              return (
                <div
                  key={snap.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      Version {snap.version}
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatTimeAgo(snap.createdAt)}
                    </p>
                  </div>
                  {isConfirming ? (
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => restoreMutation.mutate(snap.id)}
                        disabled={restoreMutation.isPending}
                      >
                        {restoreMutation.isPending ? "..." : "Confirm"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setConfirmId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setConfirmId(snap.id)}
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Restore
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {restoreMutation.isError && (
          <p className="text-xs text-red-500">
            {(restoreMutation.error as Error).message}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
