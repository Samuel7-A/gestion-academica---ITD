"""Aislamiento de horario semanal, creación y conflictos usando BD de prueba."""
def test_admin_creates_and_teacher_only_sees_own_lessons(client,admin,doc1,doc2):
    url='/api/v1/weekly-schedule'
    item={'course_section_id':'CS-2026-001','day':'lunes','slot':'07-09','room':'Aula 302'}
    assert client.get(url).status_code==401
    assert client.post(url,headers=doc1,json=item).status_code==403
    result=client.post(url,headers=admin,json=item)
    assert result.status_code==201,result.text
    pk=result.json()['id']
    own=client.get(url,headers=doc1)
    assert own.status_code==200 and any(x['id']==pk for x in own.json())
    other=client.get(url,headers=doc2)
    assert other.status_code==200 and all(x['id']!=pk for x in other.json())
    assert client.delete(f'{url}/{pk}',headers=doc1).status_code==403
    assert client.delete(f'{url}/{pk}',headers=admin).status_code==204

def test_schedule_conflict_and_validation(client,admin):
    url='/api/v1/weekly-schedule'
    first={'course_section_id':'CS-2026-001','day':'lunes','slot':'07-09','room':'Aula 302'}
    assert client.post(url,headers=admin,json=first).status_code==201
    # El mismo docente no puede tener dos cursos a la misma hora.
    second={**first,'course_section_id':'CS-2026-002','room':'Aula 104'}
    assert client.post(url,headers=admin,json=second).status_code==409
    assert client.post(url,headers=admin,json={**first,'day':'domingo'}).status_code==422
    assert client.post(url,headers=admin,json={**first,'slot':'13-14'}).status_code==422

def test_demo_seed_is_admin_only_and_idempotent(client,admin,doc1):
    url='/api/v1/weekly-schedule/demo/populate'
    assert client.post(url,headers=doc1).status_code==403
    first=client.post(url,headers=admin)
    assert first.status_code==200,first.text
    assert len(first.json())>=4
    assert client.post(url,headers=admin).status_code==409

def test_report_csv_private_and_persistent(client,doc1,doc2):
    url='/api/v1/reports'
    payload={'course_section_id':'CS-2026-001','report_type':'notas',
             'filename':'notas_prueba.csv','row_count':1,'csv_content':'Codigo;Nota\nJC-0001;16'}
    created=client.post(url,headers=doc1,json=payload)
    assert created.status_code==201,created.text
    pk=created.json()['id']
    good=client.get(f'{url}/{pk}/csv',headers=doc1)
    assert good.status_code==200 and 'JC-0001' in good.text
    assert client.get(f'{url}/{pk}/csv',headers=doc2).status_code==404
    assert client.get(f'{url}/{pk}/csv').status_code==401
