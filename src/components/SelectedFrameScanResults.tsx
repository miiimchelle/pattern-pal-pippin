import type { SelectedFrameScanResult } from '../hooks/usePluginMessages';
import { TeamFileResults } from './TeamFileResults';

function similarityBadgeClass(sim: number): string {
  if (sim >= 80) return 'badge bg-green-50 text-green-700!';
  if (sim >= 60) return 'badge bg-blue-50 text-blue-700!';
  if (sim >= 40) return 'badge bg-amber-50 text-amber-700!';
  return 'badge';
}

function severityBadgeClass(severity: 'error' | 'warning' | 'info'): string {
  if (severity === 'error') return 'badge bg-red-50 text-red-700!';
  if (severity === 'warning') return 'badge bg-amber-50 text-amber-700!';
  return 'badge bg-blue-50 text-blue-700!';
}

function buildLibraryUrl(fileKey: string, nodeId: string): string {
  const encodedNodeId = nodeId.replace(':', '-');
  return `https://www.figma.com/design/${fileKey}?node-id=${encodedNodeId}`;
}

interface Props {
  result: SelectedFrameScanResult;
  onOpenInFigma: (url: string) => void;
  onZoomToFrame?: (frameId: string) => void;
}

export function SelectedFrameScanResults({ result, onOpenInFigma, onZoomToFrame }: Props) {
  const { selectedFrame, teamFileResults, libraryMatches } = result;
  const ruleIssues = result.ruleIssues ?? [];

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Frame name */}
      <div className="border-b border-gray-200 pb-3">
        <h2 className="frame-name text-sm truncate" title={selectedFrame.name}>
          {selectedFrame.name}
        </h2>
      </div>

      {/* Team file matches as violation cards */}
      {teamFileResults.length > 0 && (
        <section>
          <div className="violations-header">
            <span>Team files</span>
            <span className="status-count">{teamFileResults.length}</span>
          </div>
          <TeamFileResults fileResults={teamFileResults} onOpenInFigma={onOpenInFigma} />
        </section>
      )}

      {/* Library matches as violation cards */}
      {libraryMatches.length > 0 && (
        <section>
          <div className="violations-header">
            <span>Design library</span>
            <span className="status-count">{libraryMatches.length}</span>
          </div>
          <div className="violations-container">
            {libraryMatches.map((match) => (
              <div
                key={match.componentId}
                onClick={() => onOpenInFigma(buildLibraryUrl(match.fileKey, match.componentId))}
                className="violation"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') onOpenInFigma(buildLibraryUrl(match.fileKey, match.componentId));
                }}
              >
                <div className="frame-name">
                  <span>{match.componentName}</span>
                  <span className={similarityBadgeClass(Math.round(match.similarity))}>
                    {Math.round(match.similarity)}% match
                  </span>
                </div>
                <div className="pattern-pal-message">
                  Library component from design system
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Rule violations */}
      {ruleIssues.length > 0 && (
        <section>
          <div className="violations-header">
            <span>Rule violations</span>
            <span className="status-count">{ruleIssues.length}</span>
          </div>
          <div className="violations-container">
            {ruleIssues.map((issue) => (
              <div
                key={`${issue.ruleId}-${issue.frameId}`}
                onClick={() => onZoomToFrame?.(issue.frameId)}
                className="violation"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') onZoomToFrame?.(issue.frameId);
                }}
              >
                <div className="frame-name">
                  <span>{issue.frameName}</span>
                  <span className={severityBadgeClass(issue.severity)}>
                    {issue.ruleName}
                  </span>
                </div>
                <div className="pattern-pal-message">
                  {issue.message}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {teamFileResults.length === 0 && libraryMatches.length === 0 && ruleIssues.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon"></div>
          <div className="empty-state-title">No violations found</div>
          <div className="empty-state-description">Your design follows the pattern rules</div>
        </div>
      )}
    </div>
  );
}
