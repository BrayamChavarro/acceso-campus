import requests

url = "http://127.0.0.1:8000/api/estudiantes/registro_completo/"
data = {
    "documento_identidad": "1111111111",
    "codigo_estudiante": "111111",
    "nombre_completo": "Fredy Estupinan",
    "correo_institucional": "festupidnan@edu.co",
    "carrera": "",
    "foto_estudiante": "data:image/jpeg;base64,aGVsbG8=",
    "foto_frontal": "data:image/jpeg;base64,aGVsbG8=",
    "foto_respaldo": "data:image/jpeg;base64,aGVsbG8="
}
response = requests.post(url, json=data)
print(response.status_code)
print(response.text)
