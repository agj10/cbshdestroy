import { writeFileSync } from "node:fs";
import { it } from 'vitest';
import * as THREE from 'three';
import { buildCampus } from '../src/campus';
import { PhysicsSimulation } from '../src/physics';
import { DisasterDirector } from '../src/disasters';
import { MAX_INTENSITY } from '../src/disaster-settings';
it.skipIf(!process.env.CBSH_BENCHMARK)('profiles campus rendering and a deterministic extreme impact', async () => {
 const campus=buildCampus();let meshes=0,draws=0,triangles=0;
 campus.group.traverse(o=>{if(o instanceof THREE.Mesh){meshes++;draws+=Array.isArray(o.material)?o.geometry.groups.length:1;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3*(o instanceof THREE.InstancedMesh?o.count:1);}});
 const sim=await PhysicsSimulation.create(campus.parts);const director=new DisasterDirector(new THREE.Scene(),sim);
 let start=performance.now();for(let i=0;i<180;i++)sim.step(1/60);const idle=performance.now()-start;
 director.launch('meteor',{x:4,y:8,z:-19.5},MAX_INTENSITY);let directorMs=0,physicsMs=0;start=performance.now();for(let i=0;i<540;i++){let tick=performance.now();director.update(1/60);directorMs+=performance.now()-tick;tick=performance.now();sim.step(1/60);physicsMs+=performance.now()-tick;}const impact=performance.now()-start;
 const result={meshes,draws,triangles,idleMs:Math.round(idle),impactMs:Math.round(impact),directorMs:Math.round(directorMs),physicsMs:Math.round(physicsMs),stats:sim.stats};console.log(JSON.stringify(result));if(process.env.CBSH_BENCHMARK_OUTPUT)writeFileSync(process.env.CBSH_BENCHMARK_OUTPUT,JSON.stringify(result,null,2));director.dispose();sim.dispose();
},120000);
