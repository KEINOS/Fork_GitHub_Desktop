import * as React from 'react'
import * as Path from 'path'

import { TextBox } from './text-box'
import { Button } from './button'
import { Row } from './row'
import { getDefaultDir, setDefaultDir } from './default-dir'
import { showOpenDialog } from '../main-process-proxy'
import { InputWarning } from './input-description/input-warning'

// We use this instead of sanitizedRepositoryName because it deals with
// valid repository names on GitHub.com but here we only care about whether
// we'll be able to create a directory with the given name. If a user
// creates a repository with a name that GitHub.com doesn't like here it'll
// get sanitized in the Publish dialog later on.
//
// Note that we don't sanitize `\` or `/` here since we use `Path.join` to
// create the full path and that will handle those characters appropriately
// letting users type something like OrgA\RepoB and have the new repo be
// created in the OrgA folder.
//
// macOS and Linux are way more allowing so there's no need to sanitize
const safeDirectoryName = (name: string) => {
  return __WIN32__ ? name.replace(/[<>:"|?*]/g, '-').replace(/\s+$/, '') : name
}

interface IRepositoryPathProps {
  /** The current name value. */
  readonly name: string

  /** The current path value, or null if still loading. */
  readonly path: string | null

  /**
   * Called when the name changes. The consumer receives the raw name;
   * use `RepositoryPath.getSafeDirectoryName` to get a sanitized version.
   */
  readonly onNameChanged: (name: string) => void

  /** Called when the path changes. */
  readonly onPathChanged: (path: string) => void

  /** Optional label for the name field. Defaults to "Name". */
  readonly nameLabel?: string

  /** Optional placeholder for the name field. */
  readonly namePlaceholder?: string

  /** Optional label for the path field. Defaults to "Local Path" / "Local path". */
  readonly pathLabel?: string

  /** Optional placeholder for the path field. */
  readonly pathPlaceholder?: string

  /** Optional aria-describedby for the name input. */
  readonly nameAriaDescribedBy?: string

  /** Optional aria-describedby for the path input. */
  readonly pathAriaDescribedBy?: string
}

/**
 * Reusable component for the name + path fields used when creating a
 * repository or worktree directory. Handles the Choose… file picker and
 * shows a warning when the name is sanitized for the file system.
 */
export class RepositoryPath extends React.Component<IRepositoryPathProps> {
  /**
   * Returns the file-system-safe version of the given name.
   * This is intentionally a static helper so that consumers can compute
   * the sanitized name and the full resolved path without duplicating
   * the sanitization logic.
   */
  public static getSafeDirectoryName(name: string): string {
    return safeDirectoryName(name)
  }

  /**
   * Returns the full resolved path for the given path and name.
   */
  public static getFullPath(path: string, name: string): string {
    return Path.join(path, safeDirectoryName(name))
  }

  /**
   * Initializes the path from the default directory. Call this from
   * the parent's componentDidMount if the path is null.
   */
  public static async getDefaultPath(): Promise<string> {
    return getDefaultDir()
  }

  /** Persists the given path as the default directory for future use. */
  public static setDefaultPath(path: string): void {
    setDefaultDir(path)
  }

  private showFilePicker = async () => {
    const path = await showOpenDialog({
      properties: ['createDirectory', 'openDirectory'],
    })

    if (path === null) {
      return
    }

    this.props.onPathChanged(path)
  }

  private renderSanitizedName() {
    const sanitizedName = safeDirectoryName(this.props.name)
    if (this.props.name === sanitizedName) {
      return null
    }

    return (
      <InputWarning
        id="repo-sanitized-name-warning"
        trackedUserInput={this.props.name}
        ariaLiveMessage={`Will be created as ${sanitizedName}. Spaces and invalid characters have been replaced by hyphens.`}
      >
        <p>Will be created as {sanitizedName}</p>
        <span className="sr-only">
          Spaces and invalid characters have been replaced by hyphens.
        </span>
      </InputWarning>
    )
  }

  public render() {
    const loadingPath = this.props.path === null

    return (
      <>
        <Row>
          <TextBox
            value={this.props.name}
            label={this.props.nameLabel ?? 'Name'}
            placeholder={this.props.namePlaceholder ?? 'name'}
            onValueChanged={this.props.onNameChanged}
            ariaDescribedBy={this.props.nameAriaDescribedBy}
          />
        </Row>

        {this.renderSanitizedName()}

        <Row>
          <TextBox
            value={this.props.path ?? ''}
            label={
              this.props.pathLabel ?? (__DARWIN__ ? 'Local Path' : 'Local path')
            }
            placeholder={this.props.pathPlaceholder ?? 'path'}
            onValueChanged={this.props.onPathChanged}
            disabled={loadingPath}
            ariaDescribedBy={this.props.pathAriaDescribedBy}
          />
          <Button onClick={this.showFilePicker} disabled={loadingPath}>
            Choose…
          </Button>
        </Row>
      </>
    )
  }
}
