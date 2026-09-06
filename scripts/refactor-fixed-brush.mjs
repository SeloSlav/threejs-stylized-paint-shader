import fs from 'node:fs';
const path='src/main.ts';
let s=fs.readFileSync(path,'utf8').replaceAll('\r\n','\n');
s=s.replaceAll("import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';\n",'').replaceAll("import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';\n",'').replaceAll("import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';\n",'');
s=s.replace("import { SceneBrushPass, SCENE_BRUSH_DEFAULTS, type SceneBrushSettings } from './SceneBrushPass.ts';", "import { SurfaceBrushwork, SCENE_BRUSH_DEFAULTS, type SceneBrushSettings } from './SurfaceBrushwork.ts';");
const start=s.indexOf('const paintTarget ='), end=s.indexOf('let sceneBrushEnabled',start);
s=s.slice(0,start)+'const sceneBrushwork = new SurfaceBrushwork(paintGlobals);\n'+s.slice(end);
s=s.replaceAll('sceneBrushPass','sceneBrushwork');
s=s.replaceAll('    composer.setPixelRatio(renderer.getPixelRatio());\n','').replaceAll('  composer.setSize(width, height);\n','').replaceAll('    composer.dispose();\n','');
s=s.replace(/  sceneBrushwork.enabled = shaderEnabled[\s\S]*?sceneBrushwork.settings.amount > 0;/, `  sceneBrushwork.sync(shaderEnabled && sceneBrushEnabled && currentDebugMode === 0
    && Number(paintGlobals.painterliness.value) > 0 && sceneBrushwork.settings.amount > 0, keyLight.intensity);`);
s=s.replace('  if (sceneBrushwork.enabled) composer.render(delta);\n  else renderer.render(scene, camera);', '  renderer.render(scene, camera);');
s=s.replace('function renderFrame(delta?: number)', 'function renderFrame()').replaceAll('renderFrame(delta);','renderFrame();');
s=s.replace('  const nativeMaterial = options.nativeMaterial', '  material.userData.pigmentContrast = options.pigmentContrast ?? 0.55;\n  const nativeMaterial = options.nativeMaterial');
s=s.replace('sceneBrushwork.addSurface(base, 0.19,', 'sceneBrushwork.addSurface(base, 0.16,');
s=s.replace('fan out at the silhouette.', 'leave bristle tips at the silhouette.');
fs.writeFileSync(path,s);
