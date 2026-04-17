figma.showUI(__html__, { width: 450, height: 600 });

async function getVariableName(variableId: string): Promise<string> {
  try {
    const variable = await figma.variables.getVariableByIdAsync(variableId);
    return variable ? variable.name : "Unknown Var";
  } catch (err) {
    return "Error reading variable";
  }
}

async function analyzeNode(node: SceneNode): Promise<any> {
  const result: any = {
    name: node.name,
    type: node.type,
    css: {},
    variables: {}
  };

  try {
    if ("getCSSAsync" in node) {
      result.css = await node.getCSSAsync();
    }
  } catch (err) {
    result.css = "Error fetching CSS";
  }

  if ("boundVariables" in node && node.boundVariables) {
    const bound = node.boundVariables;
    for (const key in bound) {
      const varData = (bound as any)[key];
      if (Array.isArray(varData) && varData.length > 0) {
        result.variables[key] = await getVariableName(varData[0].id);
      } else if (varData && varData.id) {
        result.variables[key] = await getVariableName(varData.id);
      }
    }
  }

  if ("children" in node) {
    const childrenData = [];
    for (const child of (node as any).children) {
      const childAnalysis = await analyzeNode(child);
      childrenData.push(childAnalysis);
    }
    if (childrenData.length > 0) {
      result.children = childrenData;
    }
  }

  return result;
}

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'analyze-frame') {
    const selection = figma.currentPage.selection;

    if (selection.length !== 1 || selection[0].type !== "FRAME") {
      figma.notify("⚠️ Пожалуйста, выберите ровно один ФРЕЙМ");
      return;
    }

    figma.notify("⏳ Глубокий анализ всей структуры...");
    
    try {
      const fullTree = await analyzeNode(selection[0]);
      figma.ui.postMessage({ type: 'analysis-result', data: fullTree });
      figma.notify("✅ Анализ завершен");
    } catch (err) {
      figma.notify("❌ Ошибка при анализе");
    }
  }

  if (msg.type === 'export-png') {
    const selection = figma.currentPage.selection;
    if (selection.length === 1 && selection[0].type === "FRAME") {
      const bytes = await selection[0].exportAsync({ format: "PNG", constraint: { type: "SCALE", value: 2 } });
      figma.ui.postMessage({ type: 'download-png', bytes, name: selection[0].name });
    }
  }
};