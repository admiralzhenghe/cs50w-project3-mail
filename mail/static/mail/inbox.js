document.addEventListener('DOMContentLoaded', function() {

  // Use buttons to toggle between views
  document.querySelector('#inbox').addEventListener('click', () => load_mailbox('inbox'));
  document.querySelector('#sent').addEventListener('click', () => load_mailbox('sent'));
  document.querySelector('#archived').addEventListener('click', () => load_mailbox('archive'));
  document.querySelector('#compose').addEventListener('click', compose_email);

  // By default, load the inbox
  load_mailbox('inbox');

  // Submit button calls the send_email function
  document.querySelector('#compose-form').onsubmit = send_email;
  
});

// Remove all emails currently rendered by Javascript
function remove_emails() { document.getElementById('emails-view').secondElementChild = '';}

function compose_email() {
  remove_emails();

  // Show compose view and hide other views
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#view-email').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'block';

  document.querySelector('#compose-title').textContent = 'New Email';

  // Clear out composition fields
  document.querySelector('#compose-recipients').value = '';
  document.querySelector('#compose-subject').value = '';
  document.querySelector('#compose-body').value = '';
}

function send_email(event) {
  event.preventDefault();

  const recipients = document.querySelector('#compose-recipients').value;
  const subject = document.querySelector('#compose-subject').value;
  const body = document.querySelector('#compose-body').value;

  // Send email data to the Django server
  fetch('/emails', {
    method: 'POST',
    body: JSON.stringify({
      recipients: recipients,
      subject: subject,
      body: body
    }),
  })
    setTimeout(() => { load_mailbox('sent'); }, 100);
}

// Create an object to track selected emails
let selected = {};
function resetSelected() { selected = {} };

function load_mailbox(mailbox) {

  // Show the mailbox and hide other views
  document.querySelector('#emails-view').style.display = 'block';
  document.querySelector('#view-email').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'none';
  
  // Show the mailbox name
  document.querySelector('#emails-view').innerHTML = `<h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>`;
  
  // Reset the Archive button
  archiveButtonOn = false;
  
  // Reset selected email
  resetSelected();
  
  // Remove any emails being rendered 
  remove_emails();
 
  // Show existing emails in the selected mailbox
  show_emails(mailbox);
}

// Create a variable to track the current mailbox
let currentMailbox;

function show_emails(mailbox) {
  let result;
  fetch(`/emails/${mailbox}`)
    .then(response => response.json())
    .then(data => {
      result = data.map(item => {
        let recipients = item.recipients.length > 1 ? item.recipients[0].concat('...') : item.recipients;
        return `<div class="email" value=${item.id} style="background-color: ${item.read ? "#d8dadb" : "white"}">
          <div class="checkbox-container">
          <input class="checkbox" type="checkbox" value=${item.id}>
          </div>
          <div style="width: 100%;">
            <div style="display: grid; align-items: center; grid-template-columns: .75fr 1fr .75fr;">
              <div style="text-align: left;">${mailbox === 'sent' ? recipients : item.sender}</div>
              <div style="text-align: center;">${item.subject}</div>
              <span style="text-align: right">${item.timestamp}</span>
            </div>
          </div>
        </div>`
      })
      .join('');
      document.querySelector('#emails-view').insertAdjacentHTML('beforeEnd', result);
      document.querySelectorAll('.email').forEach(email => email.classList.add('formatted'));
      document.querySelectorAll('.email').forEach(email => email.addEventListener('click', handleEmailClick, {once: true}));
      document.querySelectorAll('.checkbox').forEach(check => check.addEventListener('click', handleCheckbox));
    });
  currentMailbox = mailbox;
}

function handleEmailClick(e) {
  // Reset selected emails and mark the clicked email as selected 
  resetSelected();
  selected[e.currentTarget.getAttribute('value')] = true;

  // Get the email ID
  let id = (e.currentTarget.getAttribute('value'));
  fetch(`/emails/${id}`)
    .then(response => response.json())
    .then(email => {
      // First mark the clicked mail as read
      fetch(`/emails/${id}`, {
        method: 'PUT',
        body: JSON.stringify({read: true})
      })
        // Then show the email
        .then(response => showClickedEmail(email))
  })
}

// Show the clicked email
function showClickedEmail(email) {
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#view-email').style.display = 'block';
  document.getElementById('sender').innerHTML = `From: ${email.sender}`;
  document.getElementById('recipient').innerHTML = `To: ${email.recipients.join(', ')}`;
  document.getElementById('subject').innerHTML = `Subject: ${email.subject}`;
  document.getElementById('content').innerHTML = `${email.body}`;

  // When viewing the "Sent" mailbox, hide the "Reply" and "Archive" buttons
  if (currentMailbox === "sent") {
    document.getElementById("reply").style.display = 'none';
    document.getElementById("archive").style.display = 'none';
  } 
  else {
    document.getElementById("reply").style.display = 'block';
    document.getElementById("archive").style.display = 'block';
  }

  // Handle archive/unarchive click
  if (email.archived === true) document.getElementById("archive").innerHTML = "Unarchive";
  else if (email.archived === false) document.getElementById("archive").innerHTML = "Archive";
  document.getElementById("archive").addEventListener('click', handleArchiveButtonClick);

  // Handle reply click
  document.querySelector("#reply").addEventListener('click', () => handleReplyButtonClick(email, event));
}

function handleReplyButtonClick(email, event) {
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#view-email').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'block';

  document.querySelector('#compose-title').textContent = `Re: ${email.subject}`;
  document.querySelector('#compose-recipients').value = `${email.sender}`;
  document.querySelector('#compose-subject').value = `Re: ${email.subject}`;
  document.querySelector('#compose-body').value = `On ${email.timestamp}, <${email.sender}> wrote:\n${email.body}\n\n--------------------\n\n`;
}

// Globally scopped variable to track whether or not the archive button is on
let archiveButtonOn = false;

// Create an archive button
const archiveButton = document.createElement('button');
archiveButton.classList.add('archiveButton');

function handleCheckbox(e) {
  e.stopPropagation();
  if (e.target.checked) selected[e.target.value] = true;
  else if (!e.target.checked) selected[e.target.value] = false;

  if (currentMailbox === "archive") archiveButton.innerHTML = `Unarchive`;
  else if (currentMailbox === "inbox") archiveButton.innerHTML = `Archive`;
  archiveButton.style.color = 'white';

  let anyCheckboxesSelected = Object.values(selected).includes(true);

  if (anyCheckboxesSelected && !archiveButtonOn) showArchiveButton();
  else if (!anyCheckboxesSelected) hideArchiveButton();
}

function showArchiveButton() {
  document.getElementById("emails-view").firstElementChild.insertAdjacentElement('afterend', archiveButton);
  archiveButton.addEventListener('click', handleArchiveButtonClick);
  archiveButtonOn = true;
}

function hideArchiveButton() {
  document.getElementById("emails-view").removeChild(archiveButton);
  archiveButton.removeEventListener('click', handleArchiveButtonClick);
  archiveButtonOn = false;
}

// Archive or unarchive the selected email(s)
function handleArchiveButtonClick(e) {
  Object.keys(selected).forEach(id => {
    if (selected[id]) {
      if (e.target.textContent === "Archive") { archive(id); }
      else if (e.target.textContent === "Unarchive") { unarchive(id); }
    }
  })
  setTimeout(() => { load_mailbox('inbox'); }, 100);
}

function archive(id) {
  fetch(`/emails/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ archived: true })
  })
}

function unarchive(id) {
  fetch(`/emails/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ archived: false })
  })
}