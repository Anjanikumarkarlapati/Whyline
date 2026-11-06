import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DEMO_FILES } from './demoFiles';

const WorkbenchContext = createContext(null);

export function WorkbenchProvider({ children }) {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL query params as initial/canonical state
  const urlFile = searchParams.get('file');
  const urlLine = searchParams.get('line');
  const urlPanel = searchParams.get('panel');
  const urlFence = searchParams.get('fence');

  const defaultFile = DEMO_FILES[0].path;
  const initialFile = urlFile || defaultFile;
  const initialLine = urlLine ? parseInt(urlLine, 10) : DEMO_FILES[0].defaultLine;
  const initialPanel = urlPanel && ['fence', 'why', 'ask'].includes(urlPanel) ? urlPanel : 'fence';
  const initialFence = urlFence || DEMO_FILES[0].fenceId;

  const [file, setFileState] = useState(initialFile);
  const [line, setLineState] = useState(initialLine);
  const [panel, setPanelState] = useState(initialPanel);
  const [fenceId, setFenceIdState] = useState(initialFence);

  // Sync state if URL search params change externally (e.g. back/forward navigation or deep link)
  useEffect(() => {
    if (urlFile && urlFile !== file) {
      setFileState(urlFile);
    }
    if (urlLine) {
      const parsed = parseInt(urlLine, 10);
      if (!isNaN(parsed) && parsed !== line) {
        setLineState(parsed);
      }
    }
    if (urlPanel && ['fence', 'why', 'ask'].includes(urlPanel) && urlPanel !== panel) {
      setPanelState(urlPanel);
    }
    if (urlFence !== undefined && urlFence !== fenceId) {
      setFenceIdState(urlFence);
    }
  }, [urlFile, urlLine, urlPanel, urlFence]);

  // Helper to commit state changes to URL search params
  const updateParams = (newFile, newLine, newPanel, newFence) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('file', newFile);
    nextParams.set('line', String(newLine));
    nextParams.set('panel', newPanel);
    if (newFence) {
      nextParams.set('fence', newFence);
    } else {
      nextParams.delete('fence');
    }
    setSearchParams(nextParams, { replace: true });
  };

  const selectFile = (newFilePath) => {
    const targetDoc = DEMO_FILES.find((f) => f.path === newFilePath) || DEMO_FILES[0];
    const targetLine = targetDoc.defaultLine || 1;
    const targetFence = targetDoc.fenceId || null;
    setFileState(targetDoc.path);
    setLineState(targetLine);
    setFenceIdState(targetFence);
    updateParams(targetDoc.path, targetLine, panel, targetFence);
  };

  const selectLine = (newLine, newFenceId = null) => {
    setLineState(newLine);
    setFenceIdState(newFenceId);
    updateParams(file, newLine, panel, newFenceId);
  };

  const setPanel = (newPanel) => {
    if (!['fence', 'why', 'ask'].includes(newPanel)) return;
    setPanelState(newPanel);
    updateParams(file, line, newPanel, fenceId);
  };

  const selectLocation = ({ file: f, line: l, fenceId: id, panel: p }) => {
    const nextF = f || file;
    const nextL = l !== undefined ? l : line;
    const nextP = p || panel;
    const nextId = id !== undefined ? id : fenceId;

    setFileState(nextF);
    setLineState(nextL);
    setPanelState(nextP);
    setFenceIdState(nextId);
    updateParams(nextF, nextL, nextP, nextId);
  };

  const activeDoc = DEMO_FILES.find((f) => f.path === file) || DEMO_FILES[0];

  return (
    <WorkbenchContext.Provider
      value={{
        file,
        line,
        panel,
        fenceId,
        activeDoc,
        demoFiles: DEMO_FILES,
        selectFile,
        selectLine,
        setPanel,
        selectLocation,
      }}
    >
      {children}
    </WorkbenchContext.Provider>
  );
}

export function useWorkbenchSelection() {
  const ctx = useContext(WorkbenchContext);
  if (!ctx) {
    throw new Error('useWorkbenchSelection must be used within a WorkbenchProvider');
  }
  return ctx;
}
