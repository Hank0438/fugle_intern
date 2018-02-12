from __future__ import print_function
import httplib2
import os

from apiclient import discovery
import oauth2client
from oauth2client import client
from oauth2client import tools

from datetime import datetime
import requests
from bs4 import BeautifulSoup

code = []
name = []
date = []
time = []
location = []
descript = []
url = "http://mops.twse.com.tw/mops/web/t100sb02_1"
typ = ["sii","otc","rotc","pub"]
month = ["01","02","03","04","05","06","07","08","09","10","11","12"]
payload = []
for mo in month:
    for ty in typ:
        payload.append("encodeURIComponent=1&step=1&firstin=1&off=1&TYPEK="+ty+"&year=105&month="+mo+"&co_id=")

headers = {
    'cache-control': "no-cache",
    'postman-token': "d318ad7b-873e-5811-9e04-b3799655aaf8",
    'content-type': "application/x-www-form-urlencoded"
    }
for pay in payload:
    response = requests.request("POST", url, data=pay, headers=headers)
    response.encoding = "utf-8"

    soup = BeautifulSoup(response.text, "html.parser")

    ss = ["even","odd"]
    for z in ss:
        s = soup.find_all("tr", {"class": z })
        for i in s:
            st = i.find_all("td")
            a = st[0].string.strip()
            code.append(str(a))
            b = st[1].string.strip()
            name.append(str(b))
            c = st[2].string.strip()
            date.append(str(c))
            d = st[3].string.strip()
            time.append(str(d))
            e = st[4].string.strip()
            location.append(str(e))
            f = st[5].string.strip()
            descript.append(str(f))


for y in range(len(date)):
    date[y] = str((date[y])).replace('105','2016')
    date[y] = str((date[y])).replace('/','-')
    if len(date[y]) != 10:
        date[y] =str((date[y])).replace((date[y])[10:25],'')
    

try:
    import argparse
    flags = argparse.ArgumentParser(parents=[tools.argparser]).parse_args()
except ImportError:
    flags = None

# If modifying these scopes, delete your previously saved credentials
# at ~/.credentials/calendar-python-quickstart.json
SCOPES = 'https://www.googleapis.com/auth/calendar'
CLIENT_SECRET_FILE = 'client_secret.json'
APPLICATION_NAME = 'Google Calendar API Python Quickstart 2'

def get_credentials():
    """Gets valid user credentials from storage.

    If nothing has been stored, or if the stored credentials are invalid,
    the OAuth2 flow is completed to obtain the new credentials.

    Returns:
        Credentials, the obtained credential.
    """
    home_dir = os.path.expanduser('~')
    credential_dir = os.path.join(home_dir, '.credentials')
    if not os.path.exists(credential_dir):
        os.makedirs(credential_dir)
    credential_path = os.path.join(credential_dir,
                                   'calendar-python-quickstart.json')

    store = oauth2client.file.Storage(credential_path)
    credentials = store.get()
    if not credentials or credentials.invalid:
        flow = client.flow_from_clientsecrets(CLIENT_SECRET_FILE, SCOPES)
        flow.user_agent = APPLICATION_NAME
        if flags:
            credentials = tools.run_flow(flow, store, flags)
        else: # Needed only for compatibility with Python 2.6
            credentials = tools.run(flow, store)
        print('Storing credentials to ' + credential_path)
    return credentials

def main():
    credentials = get_credentials()
    http = credentials.authorize(httplib2.Http())
    service = discovery.build('calendar', 'v3', http=http)

    page_token = None
    eventid=[]
    while True:
        ev = service.events().list(calendarId='u6467sf3hkhgh2vtpje7pcuk9s@group.calendar.google.com', pageToken=page_token).execute()
        for eve in ev['items']:
            eventid.append(eve['id'])
        page_token = ev.get('nextPageToken')
        if not page_token:
            break
    print (len(eventid))

    for idd in eventid:
        service.events().delete(calendarId='u6467sf3hkhgh2vtpje7pcuk9s@group.calendar.google.com', eventId=idd).execute()

    for x in range(len(code)):
        event = {
          'summary': str(code[x])+str(name[x]),
          'location': str(location[x]),
          'description': str(descript[x]),
          'start': {
            'dateTime': str(date[x])+'T'+str(time[x])+':00+08:00',
            'timeZone': 'Asia/Taipei',
          },
          'end': {
            'dateTime': str(date[x])+'T'+str(time[x])+':00+08:00',
            'timeZone': 'Asia/Taipei',
          },
        }

        event = service.events().insert(calendarId='u6467sf3hkhgh2vtpje7pcuk9s@group.calendar.google.com', body=event).execute()
 
if __name__ == '__main__':
    main()