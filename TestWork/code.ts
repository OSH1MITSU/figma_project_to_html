figma.showUI(__html__, { width: 320, height: 400 });

figma.ui.onmessage = async (msg) => {
  const selection = figma.currentPage.selection;
  const frame = selection.find(node => node.type === "FRAME") as FrameNode;

  if (!frame) {
    figma.notify("❌ Сначала выберите фрейм");
    return;
  }

  if (msg.type === 'analyze-frame') {
    const css = await frame.getCSSAsync();
    
    const childrenInfo = await Promise.all(frame.children.map(async (child) => {
      let varName = "Нет переменной";
      if ("boundVariables" in child && child.boundVariables && child.boundVariables.fills) {
        const varId = child.boundVariables.fills[0].id;
        const variable = await figma.variables.getVariableByIdAsync(varId);
        if (variable) varName = variable.name;
      }

      return { name: child.name, type: child.type, variable: varName };
    }));

    const result = {
      frameName: frame.name,
      css: css,
      elements: childrenInfo
    };

    figma.ui.postMessage({ type: 'analysis-result', data: result });
  }

  if (msg.type === 'export-png') {
    const bytes = await frame.exportAsync({
      format: "PNG",
      constraint: { type: "SCALE", value: 2 }
    });

    figma.ui.postMessage({ type: 'download-png', bytes, name: frame.name });
    figma.notify("✅ PNG готов");
  }
};