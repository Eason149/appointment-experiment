const fs=require('fs'),vm=require('vm'),assert=require('assert');
const listeners={},elements={},files=[];
const el=id=>elements[id]||(elements[id]={innerHTML:'',textContent:'',value:'',checked:false,classList:{add(){},remove(){}},addEventListener(k,f){listeners[id+':'+k]=f},getBoundingClientRect(){return {x:0,y:0,width:10,height:10}},focus(){}});
const ctx={console,crypto:{randomUUID:()=> 'test-session'},localStorage:{getItem:()=>null,setItem(){}},document:{getElementById:el,querySelectorAll:()=>[],addEventListener(){},body:{appendChild(){}},createElement:()=>({click(){files.push({name:this.download,url:this.href})},remove(){}})},performance:{now:()=>100,timeOrigin:1000},Date,Math,JSON,Blob,URL:{createObjectURL:b=>{ctx.lastBlob=b;return 'blob:test'},revokeObjectURL(){}},setTimeout:()=>1,clearTimeout(){},requestAnimationFrame:f=>f(),innerWidth:1200,innerHeight:900,scrollX:0,scrollY:0,window:{addEventListener(){}},alert(){},confirm:()=>true};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/app.js','utf8'),ctx);
const run=x=>vm.runInContext(x,ctx);
run("s.participant='TEST';s.active=true;startTrial();selection={patient:'陈建国',campus:'西院区',department:'健康管理门诊',date:dates[2],time:times[3],type:'普通门诊',doctor:'王宁',agreed:true};submit()");
assert.equal(run('s.submissions[0].matches_requirement'),false);
run("selection={...s.bookings[0],campus:'东院区',editId:s.bookings[0].id,agreed:true};submit();finish()");
assert.equal(run('s.submissions.length'),2);assert.equal(run('s.bookings.length'),1);assert.equal(run('s.outcomes[0].outcome'),'correct_final_booking');
run("startTrial();finish(true)");assert.equal(run('s.outcomes[1].outcome'),'abandonment');
const text=run('csvText([{value:\'中文,逗号\',quote:\'a"b\',nested:{x:1},line:\'a\\nb\'}])');assert(text.startsWith('\ufeff'));assert(text.includes('"a""b"'));assert(text.includes('中文,逗号'));assert(text.includes('"a\nb"'));
run("exportCSV(s.events,'events');exportCSV(s.submissions,'submissions');exportCSV(s.outcomes,'outcomes');download(JSON.stringify(s),'backup','json','application/json')");assert.equal(files.length,4);assert(files[0].name.endsWith('_events.csv'));assert(files[3].name.endsWith('.json'));
console.log('PASS: wrong submission → corrected final booking; abandonment; CSV escaping/BOM; four download dispatches. Browser download acceptance still requires manual check.');

run("s.trial=0;s.events=[];s.submissions=[];s.outcomes=[];s.bookings=[];startTrial();choose('department','营养门诊');choose('department','健康管理门诊');selection={...selection,date:dates[2],time:times[3],doctor:'王宁',agreed:true};submit();finish()");
assert.equal(run('s.outcomes[0].recovered'),true);assert.equal(run('s.outcomes[0].error_count'),1);assert.equal(run('s.events.find(e=>e.event_type===\"selection_change\").is_target'),false);assert(run('s.events.find(e=>e.event_type===\"TASK_START\").task_elapsed_ms')>=0);assert.equal(run('s.events.find(e=>e.event_type===\"TASK_END\").trial_outcome'),'correct_final_booking');assert.equal(run('s.events[s.events.length-1].task_elapsed_ms'),null);console.log('PASS: selection target, elapsed time, recovery summary and TASK_END outcome.');

run("startTrial()");assert(!run("app.innerHTML").includes("研究员导出"));run("researchOpen=true;render()");assert(run("app.innerHTML").includes("研究员导出"));console.log("PASS: researcher controls absent until explicitly opened.");

run("s.trial=0;s.active=true;researchOpen=false;startTrial()");assert(run("app.innerHTML").includes("完成本次办理"));assert(!run("app.innerHTML").includes("研究员导出"));run("finish()");assert.equal(run("s.trial"),1);assert.equal(run("page"),"brief");assert(run("app.innerHTML").includes("周淑华"));run("s.trial=3;startTrial();finish()");assert.equal(run("page"),"done");console.log("PASS: participant completion visible; next requirement and final completion.");

const early=run("csvText([{event_type:'page_open'}])");for(const key of ['epoch_ms','task_elapsed_ms','monotonic_ms','time_origin_ms','task_duration_ms'])assert(early.split('\r\n')[0].includes(key));run("s.trial=0;startTrial();finish()");assert(run('s.events.findLast(e=>e.event_type===\"TASK_END\").task_duration_ms')>=0);console.log('PASS: fixed time columns even before task completion; duration recorded at TASK_END.');

run("trials=[{...presetTrials[0],doctor:'张明',note:'test'}];s.trial=0;startTrial()");assert.equal(run("matches({...trials[0],doctor:'王宁'})"),false);assert.equal(run("matches({...trials[0],doctor:'张明'})"),true);run("finish()");assert.equal(run("page"),'done');assert(run("s.events.findLast(e=>e.event_type===\"TASK_START\").task_requirement.doctor")==='张明');console.log('PASS: configured doctor matching, requirement snapshot and single-task completion.');
