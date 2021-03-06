import { Rule, SchematicContext, Tree, chain, apply, url, move, mergeWith } from '@angular-devkit/schematics';
import { Schema } from './schema';
import { addPackageToPackageJson, getWorkspace, getProjectFromWorkspace, WorkspaceProject, getStylesPath } from 'schematics-utilities';
import { bootstrapPkg } from '../dependences';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import { red, italic } from '@angular-devkit/core/src/terminal';
import { buildRootPath } from '@objectivity/angular-schematic-utils';

export function bootstrapMini(options: Schema): Rule {
    return (tree: Tree, context: SchematicContext) => {

        const workspace = getWorkspace(tree);
        const projectName = options.project;
        const workspaceProject = getProjectFromWorkspace(workspace, projectName);

        addPackageToPackageJson(tree, 'dependencies', bootstrapPkg.pkg, bootstrapPkg.version);

        if (options.skipInstall !== true) {
            context.addTask(new NodePackageInstallTask());
        }

        return chain([
            addSccsFiles(workspaceProject),
            updateAppStyle(workspaceProject)
        ]);
    };
}

function addSccsFiles(workspaceProject: WorkspaceProject) {

    return (_host: Tree) => {
        const projectPath = buildRootPath(workspaceProject);

        const templateSource = apply(url('./files'), [
            move(projectPath)
        ]);

        return mergeWith(templateSource);
    };
}

function updateAppStyle(workspaceProject: WorkspaceProject) {
    return (host: Tree) => {
        const styleFilePath = getStylesPath(workspaceProject);

        if (!styleFilePath) {
            console.warn(red(`Could not find the default style file for this project.`));
            return;
        }

        const buffer = host.read(styleFilePath);

        if (!buffer) {
            console.warn(red(`Could not read the default style file within the project (${italic(styleFilePath)})`));
            return;
        }

        const htmlContent = buffer.toString();
        const insertion = '\n' +
            `@import 'scss/bootstrap.scss';\n` +
            `@import 'scss/objectivity-material.scss';\n`;

        if (htmlContent.includes(insertion)) {
            return;
        }

        const recorder = host.beginUpdate(styleFilePath);

        recorder.insertLeft(htmlContent.length, insertion);
        host.commitUpdate(recorder);
    };
}

