import * as React from 'react'

import { Branch } from '../../models/branch'
import { Repository } from '../../models/repository'
import { Dispatcher } from '../dispatcher'
import { Dialog, DialogContent, DialogFooter } from '../dialog'
import { RefNameTextBox } from '../lib/ref-name-text-box'
import { Row } from '../lib/row'
import { OkCancelButtonGroup } from '../dialog/ok-cancel-button-group'
import { addWorktree, listWorktrees } from '../../lib/git/worktree'
import { BranchAutocompletionProvider } from '../autocompletion/branch-autocompletion-provider'
import memoizeOne from 'memoize-one'
import { RepositoryPath } from '../lib/repository-path'
import { Ref } from '../lib/ref'

interface IAddWorktreeDialogProps {
  readonly repository: Repository
  readonly dispatcher: Dispatcher
  readonly onDismissed: () => void
  readonly initialBranchName?: string
  readonly allBranches: ReadonlyArray<Branch>
}

interface IAddWorktreeDialogState {
  readonly name: string
  readonly path: string | null
  readonly branchName: string
  readonly creating: boolean
}

export class AddWorktreeDialog extends React.Component<
  IAddWorktreeDialogProps,
  IAddWorktreeDialogState
> {
  private getAutocompletionProvider = memoizeOne(
    (branches: ReadonlyArray<Branch>) =>
      new BranchAutocompletionProvider(branches)
  )

  public constructor(props: IAddWorktreeDialogProps) {
    super(props)

    this.state = {
      name: '',
      path: null,
      branchName: props.initialBranchName ?? '',
      creating: false,
    }
  }

  public async componentDidMount() {
    const path = await RepositoryPath.getDefaultPath()
    this.setState(s => (s.path === null ? { path } : null))
  }

  private onNameChanged = (name: string) => {
    this.setState({ name })
  }

  private onPathChanged = (path: string) => {
    this.setState({ path })
  }

  private onBranchNameChanged = (branchName: string) => {
    this.setState({ branchName })
  }

  private branchExists(name: string): boolean {
    return this.props.allBranches.some(b => b.name === name)
  }

  private getFullPath(): string | null {
    const { path, name } = this.state
    if (path === null || name.trim().length === 0) {
      return null
    }
    return RepositoryPath.getFullPath(path, name)
  }

  private onSubmit = async () => {
    const fullPath = this.getFullPath()
    const { branchName } = this.state

    if (fullPath === null) {
      return
    }

    this.setState({ creating: true })

    const branchExists = this.branchExists(branchName)

    try {
      await addWorktree(this.props.repository, fullPath, {
        branch: branchExists ? branchName : undefined,
        createBranch:
          !branchExists && branchName.length > 0 ? branchName : undefined,
      })
    } catch (e) {
      this.props.dispatcher.postError(e)
      this.setState({ creating: false })
      return
    }

    const { dispatcher, repository } = this.props
    const worktrees = await listWorktrees(repository)
    const worktree = worktrees.find(wt => wt.path === fullPath)

    if (!worktree) {
      this.props.dispatcher.postError(
        new Error('Failed to find the newly created worktree')
      )
      this.setState({ creating: false })
      return
    }

    await dispatcher.switchWorktree(repository, worktree)

    this.setState({ creating: false })
    this.props.onDismissed()
  }

  private renderBranchStatus() {
    const { branchName } = this.state
    if (branchName.length === 0) {
      return null
    }

    const exists = this.branchExists(branchName)
    const message = exists
      ? `Will check out existing branch "${branchName}"`
      : `Will create new branch "${branchName}"`

    return (
      <Row>
        <p className="branch-status-hint">{message}</p>
      </Row>
    )
  }

  private renderPathMessage() {
    const fullPath = this.getFullPath()
    if (fullPath === null) {
      return null
    }

    return (
      <div id="add-worktree-path-msg">
        The worktree will be created at <Ref>{fullPath}</Ref>.
      </div>
    )
  }

  public render() {
    const fullPath = this.getFullPath()
    const disabled = fullPath === null || this.state.creating
    const loadingPath = this.state.path === null

    return (
      <Dialog
        id="add-worktree"
        title={__DARWIN__ ? 'Add Worktree' : 'Add worktree'}
        loading={this.state.creating}
        onSubmit={this.onSubmit}
        onDismissed={this.props.onDismissed}
      >
        <DialogContent>
          <RepositoryPath
            name={this.state.name}
            path={this.state.path}
            onNameChanged={this.onNameChanged}
            onPathChanged={this.onPathChanged}
            nameLabel={__DARWIN__ ? 'Worktree Name' : 'Worktree name'}
            namePlaceholder="worktree name"
            pathLabel={__DARWIN__ ? 'Local Path' : 'Local path'}
            pathPlaceholder="worktree path"
          />

          <Row>
            <RefNameTextBox
              label={__DARWIN__ ? 'Branch Name' : 'Branch name'}
              initialValue={this.state.branchName}
              onValueChange={this.onBranchNameChanged}
              autocompletionProvider={this.getAutocompletionProvider(
                this.props.allBranches
              )}
            />
          </Row>
          {this.renderBranchStatus()}
        </DialogContent>

        <DialogFooter>
          {this.renderPathMessage()}
          <OkCancelButtonGroup
            okButtonText={__DARWIN__ ? 'Create Worktree' : 'Create worktree'}
            okButtonDisabled={disabled || loadingPath}
          />
        </DialogFooter>
      </Dialog>
    )
  }
}
