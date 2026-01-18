'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { useGraphStore } from '@/lib/graph-store';
import { formatNumber } from '@/lib/monte-carlo';
import type { GraphVersion } from '@/lib/types';

function formatTime(date: Date): string {
  const d = new Date(date);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(date: Date): string {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (d.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

interface VersionItemProps {
  version: GraphVersion;
  onRestore: (id: string) => void;
}

function VersionItem({ version, onRestore }: VersionItemProps) {
  const [confirmRestore, setConfirmRestore] = useState(false);

  const handleRestore = () => {
    onRestore(version.id);
    setConfirmRestore(false);
  };

  return (
    <>
      <div
        className="p-3 border-b border-border hover:bg-muted/50 cursor-pointer transition-colors"
        onClick={() => setConfirmRestore(true)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{version.description}</p>
            <p className="text-xs text-muted-foreground">
              {formatDate(version.timestamp)} at {formatTime(version.timestamp)}
            </p>
          </div>
        </div>

        {version.simulationResult && (
          <div className="mt-2 flex gap-3 text-xs font-mono">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">P5:</span>
              <span className="text-foreground">{formatNumber(version.simulationResult.p5)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Median:</span>
              <span className="text-foreground font-medium">{formatNumber(version.simulationResult.p50)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">P95:</span>
              <span className="text-foreground">{formatNumber(version.simulationResult.p95)}</span>
            </div>
          </div>
        )}
      </div>

      <Dialog open={confirmRestore} onOpenChange={setConfirmRestore}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Restore Version</DialogTitle>
            <DialogDescription>
              Are you sure you want to restore this version? Your current graph will be replaced.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm font-medium">{version.description}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatDate(version.timestamp)} at {formatTime(version.timestamp)}
            </p>
            {version.simulationResult && (
              <div className="mt-3 p-2 bg-muted rounded text-xs font-mono">
                <div className="flex justify-between">
                  <span>P5:</span>
                  <span>{formatNumber(version.simulationResult.p5)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Median:</span>
                  <span className="font-medium">{formatNumber(version.simulationResult.p50)}</span>
                </div>
                <div className="flex justify-between">
                  <span>P95:</span>
                  <span>{formatNumber(version.simulationResult.p95)}</span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRestore(false)}>
              Cancel
            </Button>
            <Button onClick={handleRestore}>
              Restore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function VersionHistory() {
  const versions = useGraphStore((state) => state.versions);
  const restoreVersion = useGraphStore((state) => state.restoreVersion);
  const clearVersions = useGraphStore((state) => state.clearVersions);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  if (versions.length === 0) {
    return (
      <Card className="h-full flex flex-col">
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="text-sm font-semibold">Version History</h3>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-sm text-muted-foreground text-center">
            No versions yet. Versions are saved automatically when you run simulations or when AI makes changes.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="text-sm font-semibold">Version History</h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs text-muted-foreground hover:text-destructive"
          onClick={() => setShowClearConfirm(true)}
        >
          Clear
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="divide-y divide-border">
          {versions.map((version) => (
            <VersionItem
              key={version.id}
              version={version}
              onRestore={restoreVersion}
            />
          ))}
        </div>
      </ScrollArea>

      <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <DialogContent className="sm:max-w-[350px]">
          <DialogHeader>
            <DialogTitle>Clear History</DialogTitle>
            <DialogDescription>
              Are you sure you want to clear all {versions.length} versions? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                clearVersions();
                setShowClearConfirm(false);
              }}
            >
              Clear All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
