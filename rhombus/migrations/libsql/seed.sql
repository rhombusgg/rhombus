INSERT INTO rhombus_category VALUES
(1,'pwn','#ef4444'),
(2,'web','#22c55e'),
(3,'crypto','#f59e0b'),
(4,'misc','#a855f7');

INSERT INTO rhombus_author VALUES
(1,'mbund','https://www.gravatar.com/avatar',1014305712312172595),
(2,'mbunk','https://www.gravatar.com/avatar',290276083687882753);

INSERT INTO rhombus_challenge VALUES
(1,'my-first-pwn','desc abc','flag{hi}',1,TRUE,1,NULL,0,NULL),
(2,'my-second-pwn','desc def','flag{hi}',1,TRUE,1,NULL,0,NULL),
(3,'my-first-web','desc ghi','flag{hi}',2,FALSE,1,'## Some custom text\n\n',1,200),
(4,'wow','desc jkl','flag{hi}',4,TRUE,1,NULL,0,NULL),
(5,'rsa','desc mno','flag{hi}',3,FALSE,2,NULL,0,NULL);
