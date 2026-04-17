figma.showUI(__html__, { width: 400, height: 600 });

async function getVariableName(variableId: string): Promise<string> {
  try {
    const variable = await figma.variables.getVariableByIdAsync(variableId);
    return variable ? variable.name : "Unknown Variable";
  } catch {
    return "Error reading variable";
  }
}

async function analyzeNode(node: SceneNode): Promise<any> {
  const data: any = {
    name: node.name,
    type: node.type,
    css: {},
    variables: {}
  };

  if ("getCSSAsync" in node) {
    data.css = await node.getCSSAsync();
  }

  if ("boundVariables" in node && node.boundVariables) {
    const bound = node.boundVariables;
    for (const property in bound) {
      const varRef = (bound as any)[property];
      
      if (Array.isArray(varRef) && varRef.length > 0) {
        data.variables[property] = await getVariableName(varRef[0].id);
      } else if (varRef && varRef.id) {
        data.variables[property] = await getVariableName(varRef.id);
      }
    }
  }

  if ("children" in node) {
    data.children = await Promise.all(
      node.children.map(child => analyzeNode(child))
    );
  }

  return data;
}

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'analyze-frame') {
    const selection = figma.currentPage.selection;

    if (selection.length !== 1) {
      figma.notify("⚠️ Выберите ровно один объект");
      return;
    }

    const selectedNode = selection[0];
    if (selectedNode.type !== "FRAME") {
      figma.notify("⚠️ Выбранный объект должен быть фреймом");
      return;
    }

    figma.notify("🔍 Анализ структуры...");
    
    const fullStructure = await analyzeNode(selectedNode);

    figma.ui.postMessage({ type: 'analysis-result', data: fullStructure });
    figma.notify("✅ Готово");
  }

  if (msg.type === 'export-png') {
    const selection = figma.currentPage.selection;
    if (selection.length === 1 && selection[0].type === "FRAME") {
      const bytes = await selection[0].exportAsync({ format: "PNG", constraint: { type: "SCALE", value: 2 } });
      figma.ui.postMessage({ type: 'download-png', bytes, name: selection[0].name });
    } else {
      figma.notify("⚠️ Выберите один фрейм для экспорта");
    }
  }
};