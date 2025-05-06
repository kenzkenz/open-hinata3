const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

exports.notifyReply = functions.firestore
    .document('threads/{cityCode}/comments/{commentId}')
    .onCreate(async (snap, context) => {
        const comment = snap.data();
        const { cityCode, commentId } = context.params;

        if (!comment.parentId) return;

        const parentSnap = await admin
            .firestore()
            .collection('threads')
            .doc(cityCode)
            .collection('comments')
            .doc(comment.parentId)
            .get();
        const parentComment = parentSnap.data();

        if (!parentComment) return;

        console.log('メール通知はスキップされました:', parentComment.user);
    });

// const functions = require('firebase-functions');
// const admin = require('firebase-admin');
//
// admin.initializeApp();
//
// exports.notifyReply = functions.database
//     .ref('/threads/{cityCode}/{commentId}')
//     .onCreate(async (snapshot, context) => {
//         const comment = snapshot.val();
//         const { cityCode, commentId } = context.params;
//
//         if (!comment.parentId) return;
//
//         const parentSnapshot = await admin
//             .database()
//             .ref(`/threads/${cityCode}/${comment.parentId}`)
//             .once('value');
//         const parentComment = parentSnapshot.val();
//
//         if (!parentComment) return;
//
//         // メール通知は保留（コメントアウト）
//         console.log('メール通知はスキップされました:', parentComment.user);
//         /*
//         const sendgrid = require('@sendgrid/mail');
//         sendgrid.setApiKey(functions.config().sendgrid.key);
//         const msg = {
//           to: parentComment.user,
//           from: 'no-reply@open-hinata3.com',
//           subject: 'あなたのコメントに返信がありました',
//           html: `
//             <p>${comment.user}さんがあなたのコメントに返信しました：</p>
//             <p>"${comment.text}"</p>
//             <p><a href="https://yourdomain.com/map?city=${cityCode}">スレッドを見る</a></p>
//           `
//         };
//         try {
//           await sendgrid.send(msg);
//           console.log('通知メールを送信しました:', parentComment.user);
//         } catch (error) {
//           console.error('メール送信エラー:', error);
//         }
//         */
//     });




// /**
//  * Import function triggers from their respective submodules:
//  *
//  * const {onCall} = require("firebase-functions/v2/https");
//  * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
//  *
//  * See a full list of supported triggers at https://firebase.google.com/docs/functions
//  */
//
// const {onRequest} = require("firebase-functions/v2/https");
// const logger = require("firebase-functions/logger");
//
// // Create and deploy your first functions
// // https://firebase.google.com/docs/functions/get-started
//
// // exports.helloWorld = onRequest((request, response) => {
// //   logger.info("Hello logs!", {structuredData: true});
// //   response.send("Hello from Firebase!");
// // });
