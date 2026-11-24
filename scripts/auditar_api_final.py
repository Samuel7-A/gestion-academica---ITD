#!/usr/bin/env python3
"""Pruebas read-only para evidencias de integración. No modifica notas ni datos."""
import json,os,sys
from pathlib import Path
from datetime import datetime,timezone
from urllib.request import Request,urlopen
from urllib.error import HTTPError,URLError

BASE=os.getenv('APF3_BASE_URL','http://localhost:8000').rstrip('/')+'/api/v1'
EMAIL=os.getenv('APF3_EMAIL','')
PASSWORD=os.getenv('APF3_PASSWORD','')
if not EMAIL or not PASSWORD:
    sys.exit('Define APF3_EMAIL y APF3_PASSWORD como variables de entorno. No las guardes en Git.')
checks={}
def call(path,method='GET',data=None,token=''):
    req=Request(BASE+path,method=method,headers={'Accept':'application/json',**({'Authorization':'Bearer '+token} if token else {}),**({'Content-Type':'application/json'} if data is not None else {})},data=json.dumps(data).encode() if data is not None else None)
    with urlopen(req,timeout=20) as res:
        body=res.read().decode('utf-8')
        return json.loads(body) if body else None

def check(name,action):
    try:
        msg=action()
        checks[name]={'status':'PASS','detail':str(msg)[:150]}
        print('PASS',name)
    except Exception as e:
        checks[name]={'status':'FAIL','error':str(e)[:200]}
        print('FAIL',name,type(e).__name__)

check('health',lambda:call('/health')['status'])
check('ready',lambda:call('/ready')['status'])
user={}; token=''
def auth():
    global token,user
    result=call('/auth/login','POST',{'email':EMAIL,'password':PASSWORD})
    token=result['access_token']
    user=call('/auth/me',token=token)
    return 'JWT válido, rol '+user['role']
check('auth',auth)
sections=[]
def course_list():
    global sections
    sections=call('/course-sections',token=token)
    return f'{len(sections)} secciones'
if token:
    check('courses',course_list)
    check('weekly_schedule',lambda:f'{len(call("/weekly-schedule",token=token))} clases')
    check('report_history',lambda:f'{len(call("/reports",token=token))} reportes')
    if sections:
        sid=sections[0]['id']
        check('gradebook',lambda:f'{len(call("/course-sections/"+sid+"/gradebook",token=token)["students"])} estudiantes')
        check('exam_schedules',lambda:f'{len(call("/course-sections/"+sid+"/exam-schedules",token=token))} exámenes')
        def prediction():
            students=call('/course-sections/'+sid+'/gradebook',token=token)['students']
            if not students:return 'sin alumnos de demostración'
            result=call('/ml/predict','POST',{'student_id':students[0]['student_id'],'course_section_id':sid},token=token)
            if result.get('synthetic_data') is not True: raise ValueError('El resultado no declara datos sintéticos')
            return f'modelo {result.get("model_version")} (sintético)'
        check('prediction',prediction)
# Sin PII, correo, token ni contraseñas en el reporte.
report={'timestamp_utc':datetime.now(timezone.utc).isoformat(),'environment':BASE,'synthetic_demo_only':True,'checks':checks}
path=Path(__file__).resolve().parents[1]/'Informe'/'evidencias'/'auditoria_final_api.json'
path.parent.mkdir(parents=True,exist_ok=True)
path.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print('Resultado:',path)
if any(v['status']!='PASS' for v in checks.values()):sys.exit(1)
