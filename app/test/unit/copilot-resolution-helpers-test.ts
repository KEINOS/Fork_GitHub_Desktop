import { describe, it } from 'node:test'
import assert from 'node:assert'

import {
  isDeleteConflictFile,
  getDeletedSide,
  getDeleteConflictLabels,
  getDeleteConflictChoiceLabel,
} from '../../src/ui/multi-commit-operation/dialog/copilot-resolution-helpers'
import {
  AppFileStatusKind,
  GitStatusEntry,
  ManualConflict,
  ConflictedFileStatus,
} from '../../src/models/status'

// ---------------------------------------------------------------------------
// Helpers for creating conflict status objects
// ---------------------------------------------------------------------------

function makeManualConflict(
  us: GitStatusEntry,
  them: GitStatusEntry
): ManualConflict {
  return {
    kind: AppFileStatusKind.Conflicted,
    entry: { us, them } as ManualConflict['entry'],
  }
}

function makeConflictWithMarkers(): ConflictedFileStatus {
  return {
    kind: AppFileStatusKind.Conflicted,
    entry: {
      us: GitStatusEntry.UpdatedButUnmerged,
      them: GitStatusEntry.UpdatedButUnmerged,
    },
    conflictMarkerCount: 3,
  }
}

// ---------------------------------------------------------------------------
// isDeleteConflictFile
// ---------------------------------------------------------------------------

describe('isDeleteConflictFile', () => {
  it('returns true when "us" is deleted and "them" is not', () => {
    const status = makeManualConflict(
      GitStatusEntry.Deleted,
      GitStatusEntry.UpdatedButUnmerged
    )
    assert.equal(isDeleteConflictFile(status), true)
  })

  it('returns true when "them" is deleted and "us" is not', () => {
    const status = makeManualConflict(
      GitStatusEntry.UpdatedButUnmerged,
      GitStatusEntry.Deleted
    )
    assert.equal(isDeleteConflictFile(status), true)
  })

  it('returns false when both sides are deleted', () => {
    const status = makeManualConflict(
      GitStatusEntry.Deleted,
      GitStatusEntry.Deleted
    )
    assert.equal(isDeleteConflictFile(status), false)
  })

  it('returns false when neither side is deleted', () => {
    const status = makeManualConflict(
      GitStatusEntry.UpdatedButUnmerged,
      GitStatusEntry.UpdatedButUnmerged
    )
    assert.equal(isDeleteConflictFile(status), false)
  })

  it('returns false for ConflictsWithMarkers (text conflicts)', () => {
    const status = makeConflictWithMarkers()
    assert.equal(isDeleteConflictFile(status), false)
  })

  it('returns false for BothAdded manual conflict', () => {
    const status = makeManualConflict(
      GitStatusEntry.Added,
      GitStatusEntry.Added
    )
    assert.equal(isDeleteConflictFile(status), false)
  })
})

// ---------------------------------------------------------------------------
// getDeletedSide
// ---------------------------------------------------------------------------

describe('getDeletedSide', () => {
  it('returns "ours" when us is deleted', () => {
    const status = makeManualConflict(
      GitStatusEntry.Deleted,
      GitStatusEntry.UpdatedButUnmerged
    )
    assert.equal(getDeletedSide(status), 'ours')
  })

  it('returns "theirs" when them is deleted', () => {
    const status = makeManualConflict(
      GitStatusEntry.UpdatedButUnmerged,
      GitStatusEntry.Deleted
    )
    assert.equal(getDeletedSide(status), 'theirs')
  })

  it('returns undefined when neither side is deleted', () => {
    const status = makeManualConflict(
      GitStatusEntry.UpdatedButUnmerged,
      GitStatusEntry.UpdatedButUnmerged
    )
    assert.equal(getDeletedSide(status), undefined)
  })
})

// ---------------------------------------------------------------------------
// getDeleteConflictLabels
// ---------------------------------------------------------------------------

describe('getDeleteConflictLabels', () => {
  it('labels correctly when ours deleted the file', () => {
    const status = makeManualConflict(
      GitStatusEntry.Deleted,
      GitStatusEntry.UpdatedButUnmerged
    )
    const { oursLabel, theirsLabel } = getDeleteConflictLabels(
      status,
      'main',
      'feature'
    )
    assert.equal(oursLabel, 'Delete file on main')
    assert.equal(theirsLabel, 'Keep file from feature')
  })

  it('labels correctly when theirs deleted the file', () => {
    const status = makeManualConflict(
      GitStatusEntry.UpdatedButUnmerged,
      GitStatusEntry.Deleted
    )
    const { oursLabel, theirsLabel } = getDeleteConflictLabels(
      status,
      'main',
      'feature'
    )
    assert.equal(oursLabel, 'Keep file from main')
    assert.equal(theirsLabel, 'Delete file on feature')
  })

  it('omits branch names when not provided', () => {
    const status = makeManualConflict(
      GitStatusEntry.Deleted,
      GitStatusEntry.UpdatedButUnmerged
    )
    const { oursLabel, theirsLabel } = getDeleteConflictLabels(status)
    assert.equal(oursLabel, 'Delete file')
    assert.equal(theirsLabel, 'Keep file')
  })
})

// ---------------------------------------------------------------------------
// getDeleteConflictChoiceLabel
// ---------------------------------------------------------------------------

describe('getDeleteConflictChoiceLabel', () => {
  it('returns "Copilot" for the copilot choice', () => {
    const status = makeManualConflict(
      GitStatusEntry.Deleted,
      GitStatusEntry.UpdatedButUnmerged
    )
    assert.equal(getDeleteConflictChoiceLabel('copilot', status), 'Copilot')
  })

  it('returns "Delete file" for ours when ours deleted', () => {
    const status = makeManualConflict(
      GitStatusEntry.Deleted,
      GitStatusEntry.UpdatedButUnmerged
    )
    assert.equal(getDeleteConflictChoiceLabel('ours', status), 'Delete file')
  })

  it('returns "Keep file" for theirs when ours deleted', () => {
    const status = makeManualConflict(
      GitStatusEntry.Deleted,
      GitStatusEntry.UpdatedButUnmerged
    )
    assert.equal(getDeleteConflictChoiceLabel('theirs', status), 'Keep file')
  })

  it('returns "Keep file" for ours when theirs deleted', () => {
    const status = makeManualConflict(
      GitStatusEntry.UpdatedButUnmerged,
      GitStatusEntry.Deleted
    )
    assert.equal(getDeleteConflictChoiceLabel('ours', status), 'Keep file')
  })

  it('returns "Delete file" for theirs when theirs deleted', () => {
    const status = makeManualConflict(
      GitStatusEntry.UpdatedButUnmerged,
      GitStatusEntry.Deleted
    )
    assert.equal(getDeleteConflictChoiceLabel('theirs', status), 'Delete file')
  })
})
