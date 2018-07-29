DROP TABLE IF EXISTS public."User";
CREATE TABLE "User" (
    "id" serial PRIMARY KEY NOT NULL,
    "username" character varying(100) DEFAULT '' NOT NULL,--登录名
    "password" character varying(120) DEFAULT '' NOT NULL,--用户的英文名
    "level" integer DEFAULT 0 NOT NULL,--等级
    "extra" jsonb DEFAULT '{"qq":"","wechat":""}' NOT NULL,--额外信息
    "cards" jsonb DEFAULT '[]' NOT NULL,--卡片
    "balance" numeric(12,2) NOT NULL DEFAULT 0,--余额
    "createTime" bigint DEFAULT 0 NOT NULL,--创建时间
    "lastUpdateTime" bigint DEFAULT 0 NOT NULL,
    "isLocked" boolean DEFAULT false NOT NULL
);
GRANT ALL ON "User" to financeuser;
GRANT ALL ON SEQUENCE "User_id_seq" to financeuser;