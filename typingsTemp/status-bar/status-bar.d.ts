// Type definitions for status-bar (v0.79.0)
// Project: https://github.com/atom/status-bar
// Definitions by: david-driscoll <https://github.com/david-driscoll/>
// Definitions: https://github.com/borisyankov/DefinitelyTyped

// Generated by: https://github.com/david-driscoll/atom-typescript-generator
// Generation tool by david-driscoll <https://github.com/david-driscoll/>
/// <reference path="../atom-space-pen-views/atom-space-pen-views.d.ts" />
declare module StatusBar {
    /**
     * CursorPositionView
     * This class was not documented by atomdoc, assume it is private. Use with caution.
     */
    class CursorPositionView /*extends HTMLElement*/ {
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        initialize() : boolean;
    
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        destroy() : void;
    
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        subscribeToActiveTextEditor() : Atom.TextEditor;
    
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        subscribeToConfig() : Atom.Config;
    
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        handleClick() : void;
    
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        getActiveTextEditor() : Atom.TextEditor;
    
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        updatePosition() : TextBuffer.Point;
    
    }

    /**
     * FileInfoView
     * This class was not documented by atomdoc, assume it is private. Use with caution.
     */
    class FileInfoView /*extends HTMLElement*/ {
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        initialize() : boolean;
    
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        handleCopiedTooltip() : void;
    
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        getActiveItemCopyText() : string;
    
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        subscribeToActiveItem() : any;
    
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        destroy() : void;
    
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        getActiveItem() : any;
    
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        update() : void;
    
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        updateBufferHasModifiedText(isModified? : any) : string;
    
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        updatePathText() : string;
    
    }

    /**
     * GitView
     * This class was not documented by atomdoc, assume it is private. Use with caution.
     */
    class GitView /*extends HTMLElement*/ {
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        initialize() : boolean;
    
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        createBranchArea() : any;
    
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        createCommitsArea() : any;
    
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        createStatusArea() : any;
    
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        subscribeToActiveItem() : any;
    
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        subscribeToRepositories() : any;
    
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        destroy() : void;
    
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        getActiveItemPath() : string;
    
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        getRepositoryForActiveItem() : any;
    
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        getActiveItem() : any;
    
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        update() : void;
    
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        updateBranchText(repo? : any) : string;
    
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        showBranchInformation() : any;
    
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        updateAheadBehindCount(repo? : any) : number;
    
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        updateStatusText(repo? : any) : string;
    
    }

    /**
     * LaunchModeView
     * This class was not documented by atomdoc, assume it is private. Use with caution.
     */
    class LaunchModeView /*extends HTMLElement*/ {
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        initialize({ safeMode, devMode } : { safeMode? : boolean; devMode? : boolean }) : boolean;
    
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        detachedCallback() : any;
    
    }

    /**
     * SelectionCountView
     * This class was not documented by atomdoc, assume it is private. Use with caution.
     */
    class SelectionCountView /*extends HTMLElement*/ {
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        initialize() : boolean;
    
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        destroy() : void;
    
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        subscribeToConfig() : Atom.Config;
    
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        subscribeToActiveTextEditor() : Atom.TextEditor;
    
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        getActiveTextEditor() : Atom.TextEditor;
    
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        updateCount() : number;
    
    }

    /**
     * StatusBarView
     * This class was not documented by atomdoc, assume it is private. Use with caution.
     */
    class StatusBarView /*extends HTMLElement*/ {
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        createdCallback() : any;
    
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        initialize() : boolean;
    
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        destroy() : void;
    
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        addLeftTile(options? : any) : Tile;
    
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        addRightTile(options? : any) : Tile;
    
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        getLeftTiles() : Tile[];
    
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        getRightTiles() : Tile[];
    
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        appendLeft(view? : any) : any;
    
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        prependLeft(view? : any) : any;
    
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        appendRight(view? : any) : any;
    
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        prependRight(view? : any) : any;
    
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        getActiveBuffer() : any;
    
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        getActiveItem() : any;
    
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        storeActiveBuffer() : void;
    
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        subscribeToBuffer(event? : any, callback? : any) : any;
    
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        subscribeAllToBuffer() : any;
    
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        unsubscribeAllFromBuffer() : any;
    
    }

    /**
     * Tile
     * This class was not documented by atomdoc, assume it is private. Use with caution.
     */
    class Tile {
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        item: any /* default */;
    
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        priority: any /* default */;
    
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        collection: any /* default */;
    
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        constructor(item? : any, priority? : any, collection? : any);
    
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        getItem() : any;
    
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        getPriority() : any;
    
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        destroy() : void;
    
    }

}

// Found @ https://github.com/atom/status-bar/blob/master/lib/main.coffee
declare module "status-bar" {
    function activate(state?: any): any;
    function activate(): any;
}
